// WebSocket Service for Real-time Updates
// src/services/websocketService.js

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.listeners = new Map();
  }

  connect(url = process.env.REACT_APP_WS_URL || 'ws://localhost:3001') {
    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.emit('error', error);
      };

      this.socket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.stopHeartbeat();
        this.emit('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.attemptReconnect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.stopHeartbeat();
  }

  send(type, data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    } else {
      console.warn('[WebSocket] Cannot send, socket not open');
    }
  }

  subscribe(channel, callback) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(channel);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  emit(channel, data) {
    const callbacks = this.listeners.get(channel);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'notification':
        this.emit('notification', data);
        break;
      case 'dashboard_update':
        this.emit('dashboard_update', data);
        break;
      case 'member_update':
        this.emit('member_update', data);
        break;
      case 'payment_update':
        this.emit('payment_update', data);
        break;
      case 'heartbeat':
        // Respond to heartbeat
        this.send('heartbeat', { timestamp: Date.now() });
        break;
      default:
        this.emit(type, data);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }
}

export const wsService = new WebSocketService();
