/**
 * WebSocket Client with Auto-reconnection and Token Authentication
 * Features: JWT authentication, exponential backoff, event handling, offline queueing
 */

class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 1000, // Start with 1 second
      maxReconnectInterval: 30000, // Max 30 seconds
      reconnectDecay: 1.5, // Exponential backoff factor
      maxReconnectAttempts: 10,
      timeoutInterval: 2000,
      enableLogging: true,
      ...options
    };

    // Connection state
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.connectionTimeout = null;

    // Event handlers
    this.eventHandlers = new Map();
    this.messageQueue = [];
    this.isReconnecting = false;

    // Authentication
    this.token = null;
    this.userId = null;

    // Performance metrics
    this.connectionStats = {
      connectionsAttempted: 0,
      connectionsSuccessful: 0,
      messagesReceived: 0,
      messagesSent: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      totalDowntime: 0
    };

    this.log('WebSocket client initialized');
  }

  /**
   * Connect to WebSocket server
   */
  connect(token = null) {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.log('Connection already exists');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.token = token || this.getStoredToken();
        if (!this.token) {
          const error = new Error('No authentication token provided');
          this.log('Connection failed: No token', 'error');
          reject(error);
          return;
        }

        this.connectionStats.connectionsAttempted++;
        const wsUrl = this.buildConnectionUrl();

        this.log(`Connecting to ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.log('Connection timeout', 'error');
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.timeoutInterval);

        this.ws.onopen = (event) => {
          this.handleOpen(event);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
          if (this.reconnectAttempts === 0) {
            // First close event, reject the promise
            reject(new Error(`Connection closed: ${event.code} ${event.reason}`));
          }
        };

        this.ws.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection error'));
        };

      } catch (error) {
        this.log(`Connection error: ${error.message}`, 'error');
        reject(error);
      }
    });
  }

  /**
   * Build WebSocket connection URL with authentication
   */
  buildConnectionUrl() {
    const url = new URL(this.url);

    // Add token as query parameter for initial authentication
    if (this.token) {
      url.searchParams.set('token', this.token);
    }

    // Add user ID if available
    if (this.userId) {
      url.searchParams.set('userId', this.userId);
    }

    // Add timestamp to prevent caching
    url.searchParams.set('t', Date.now().toString());

    return url.toString();
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen(event) {
    this.log('Connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Clear timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Update stats
    this.connectionStats.connectionsSuccessful++;
    this.connectionStats.lastConnectedAt = new Date();

    // Send authentication message
    this.authenticateConnection();

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    // Trigger connection event
    this.emit('connected', { timestamp: new Date() });
  }

  /**
   * Send authentication message after connection
   */
  authenticateConnection() {
    if (!this.token) return;

    try {
      // Decode JWT to get user info
      const payload = this.decodeJWT(this.token);
      this.userId = payload.userId || payload.id || payload.sub;

      const authMessage = {
        type: 'authenticate',
        token: this.token,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      this.send(authMessage);
      this.log('Authentication message sent');

    } catch (error) {
      this.log(`Authentication error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    this.connectionStats.messagesReceived++;

    try {
      const data = JSON.parse(event.data);
      this.log(`Received message: ${data.type || 'unknown'}`);

      // Handle system messages
      switch (data.type) {
        case 'auth-success':
          this.handleAuthSuccess(data);
          break;
        case 'auth-error':
          this.handleAuthError(data);
          break;
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
        case 'error':
          this.handleServerError(data);
          break;
        default:
          // Emit custom events
          this.emit(data.type, data);
          this.emit('message', data);
      }

    } catch (error) {
      this.log(`Message parsing error: ${error.message}`, 'error');
    }
  }

  /**
   * Handle authentication success
   */
  handleAuthSuccess(data) {
    this.log('Authentication successful');
    this.emit('authenticated', data);

    // Request any missed notifications
    this.send({
      type: 'sync-request',
      lastSyncTime: this.getLastSyncTime()
    });
  }

  /**
   * Handle authentication error
   */
  handleAuthError(data) {
    this.log(`Authentication failed: ${data.message}`, 'error');
    this.emit('auth-error', data);

    // Try to refresh token
    this.refreshToken().then((newToken) => {
      if (newToken) {
        this.token = newToken;
        this.reconnect();
      } else {
        // Redirect to login
        this.emit('token-expired');
      }
    });
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat(data) {
    // Respond to server heartbeat
    this.send({ type: 'heartbeat-response', timestamp: new Date().toISOString() });
  }

  /**
   * Handle server errors
   */
  handleServerError(data) {
    this.log(`Server error: ${data.message}`, 'error');
    this.emit('server-error', data);
  }

  /**
   * Handle WebSocket close event
   */
  handleClose(event) {
    this.log(`Connection closed: ${event.code} ${event.reason}`);
    this.isConnected = false;

    // Update stats
    this.connectionStats.lastDisconnectedAt = new Date();
    if (this.connectionStats.lastConnectedAt) {
      const downtime = Date.now() - this.connectionStats.lastConnectedAt.getTime();
      this.connectionStats.totalDowntime += downtime;
    }

    // Clear heartbeat
    this.stopHeartbeat();

    // Clear timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Emit disconnection event
    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // Attempt reconnection for certain close codes
    if (this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  handleError(event) {
    this.log('WebSocket error occurred', 'error');
    this.emit('error', event);
  }

  /**
   * Determine if reconnection should be attempted
   */
  shouldReconnect(closeCode) {
    // Don't reconnect for these codes
    const noReconnectCodes = [
      1000, // Normal closure
      1001, // Going away
      1005, // No status code
      4000, // Custom: Don't reconnect
      4001, // Custom: Unauthorized
      4003  // Custom: Forbidden
    ];

    return !noReconnectCodes.includes(closeCode) &&
           this.reconnectAttempts < this.options.maxReconnectAttempts;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.isReconnecting || this.reconnectTimer) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval
    );

    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, delay);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay: delay
    });
  }

  /**
   * Force reconnection
   */
  reconnect() {
    this.log('Attempting to reconnect...');

    if (this.ws) {
      this.ws.close();
    }

    this.connect(this.token).catch((error) => {
      this.log(`Reconnection failed: ${error.message}`, 'error');

      if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.log('Max reconnection attempts reached', 'error');
        this.emit('max-reconnects-reached');
      }
    });
  }

  /**
   * Send message to server
   */
  send(data) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Queueing message (not connected)');
      this.messageQueue.push(data);
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      this.connectionStats.messagesSent++;
      this.log(`Message sent: ${data.type || 'unknown'}`);
      return true;
    } catch (error) {
      this.log(`Send error: ${error.message}`, 'error');
      this.messageQueue.push(data);
      return false;
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (!this.send(message)) {
        // Re-queue if send failed
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Event handler error for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }

  /**
   * Close WebSocket connection
   */
  close(code = 1000, reason = 'Client disconnecting') {
    this.log('Closing connection');

    // Prevent reconnection
    this.reconnectAttempts = this.options.maxReconnectAttempts;

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    // Close WebSocket
    if (this.ws) {
      this.ws.close(code, reason);
    }

    this.isConnected = false;
    this.isReconnecting = false;
  }

  /**
   * Get stored authentication token
   */
  getStoredToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  /**
   * Get last sync time
   */
  getLastSyncTime() {
    return localStorage.getItem('lastSyncTime') || new Date(0).toISOString();
  }

  /**
   * Set last sync time
   */
  setLastSyncTime(time = new Date().toISOString()) {
    localStorage.setItem('lastSyncTime', time);
  }

  /**
   * Decode JWT token
   */
  decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.token;
      }
    } catch (error) {
      this.log(`Token refresh failed: ${error.message}`, 'error');
    }
    return null;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      uptime: this.connectionStats.lastConnectedAt ?
        Date.now() - this.connectionStats.lastConnectedAt.getTime() : 0
    };
  }

  /**
   * Log messages with optional level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[WebSocket ${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`);
        break;
      default:
        console.log(`${prefix} 🌐 ${message}`);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create and export default instance
const wsClient = new WebSocketClient(
  process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws',
  {
    enableLogging: process.env.NODE_ENV === 'development'
  }
);

export default wsClient;
export { WebSocketClient };