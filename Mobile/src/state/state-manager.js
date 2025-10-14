/**
 * State Management System for Al-Shuail Mobile PWA
 *
 * Simple, lightweight state management with:
 * - Reactive state updates
 * - localStorage persistence
 * - State hydration on load
 * - Computed properties
 * - Action handlers
 *
 * @module state-manager
 */

class StateManager {
  constructor() {
    this.stores = {};
    this.subscribers = {};
  }

  /**
   * Create a new store
   * @param {string} name - Store name
   * @param {Object} initialState - Initial state
   * @param {Object} options - Store options
   * @param {boolean} options.persist - Whether to persist to localStorage (default: true)
   * @param {Object} options.actions - Action handlers
   * @param {Object} options.computed - Computed properties
   * @returns {Object} Store instance
   */
  createStore(name, initialState, options = {}) {
    const {
      persist = true,
      actions = {},
      computed = {}
    } = options;

    // Load persisted state if available
    const persistedState = persist ? this.loadPersistedState(name) : null;
    const state = persistedState || initialState;

    // Create store
    const store = {
      state: this.makeReactive(name, state),
      actions: this.bindActions(name, actions),
      computed: this.bindComputed(name, state, computed),
      persist
    };

    // Register store
    this.stores[name] = store;
    this.subscribers[name] = [];

    return store;
  }

  /**
   * Make state reactive (trigger updates on changes)
   * @private
   * @param {string} storeName - Store name
   * @param {Object} state - State object
   * @returns {Proxy} Reactive state proxy
   */
  makeReactive(storeName, state) {
    const self = this;

    return new Proxy(state, {
      set(target, property, value) {
        const oldValue = target[property];

        // Set new value
        target[property] = value;

        // Persist state if enabled
        const store = self.stores[storeName];
        if (store && store.persist) {
          self.persistState(storeName, target);
        }

        // Notify subscribers
        self.notifySubscribers(storeName, property, value, oldValue);

        return true;
      }
    });
  }

  /**
   * Bind actions to store
   * @private
   * @param {string} storeName - Store name
   * @param {Object} actions - Action handlers
   * @returns {Object} Bound actions
   */
  bindActions(storeName, actions) {
    const boundActions = {};

    for (const [name, handler] of Object.entries(actions)) {
      boundActions[name] = (...args) => {
        const store = this.stores[storeName];
        return handler(store.state, ...args);
      };
    }

    return boundActions;
  }

  /**
   * Bind computed properties
   * @private
   * @param {string} storeName - Store name
   * @param {Object} state - State object
   * @param {Object} computed - Computed property definitions
   * @returns {Object} Computed properties
   */
  bindComputed(storeName, state, computed) {
    const boundComputed = {};

    for (const [name, getter] of Object.entries(computed)) {
      Object.defineProperty(boundComputed, name, {
        get() {
          const store = this.stores[storeName];
          return getter(store.state);
        }.bind(this)
      });
    }

    return boundComputed;
  }

  /**
   * Subscribe to state changes
   * @param {string} storeName - Store name
   * @param {Function} callback - Callback function (property, newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  subscribe(storeName, callback) {
    if (!this.subscribers[storeName]) {
      this.subscribers[storeName] = [];
    }

    this.subscribers[storeName].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers[storeName].indexOf(callback);
      if (index > -1) {
        this.subscribers[storeName].splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of state changes
   * @private
   * @param {string} storeName - Store name
   * @param {string} property - Changed property
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   */
  notifySubscribers(storeName, property, newValue, oldValue) {
    const subscribers = this.subscribers[storeName] || [];

    for (const callback of subscribers) {
      try {
        callback(property, newValue, oldValue);
      } catch (error) {
        console.error(`Error in subscriber for ${storeName}.${property}:`, error);
      }
    }
  }

  /**
   * Persist state to localStorage
   * @private
   * @param {string} storeName - Store name
   * @param {Object} state - State to persist
   */
  persistState(storeName, state) {
    try {
      const key = `state_${storeName}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Failed to persist state for ${storeName}:`, error);
    }
  }

  /**
   * Load persisted state from localStorage
   * @private
   * @param {string} storeName - Store name
   * @returns {Object|null} Persisted state or null
   */
  loadPersistedState(storeName) {
    try {
      const key = `state_${storeName}`;
      const persisted = localStorage.getItem(key);
      return persisted ? JSON.parse(persisted) : null;
    } catch (error) {
      console.error(`Failed to load persisted state for ${storeName}:`, error);
      return null;
    }
  }

  /**
   * Get store by name
   * @param {string} storeName - Store name
   * @returns {Object|null} Store instance or null
   */
  getStore(storeName) {
    return this.stores[storeName] || null;
  }

  /**
   * Reset store to initial state
   * @param {string} storeName - Store name
   * @param {Object} initialState - Initial state
   */
  resetStore(storeName, initialState) {
    const store = this.stores[storeName];
    if (!store) return;

    // Clear state
    for (const key of Object.keys(store.state)) {
      delete store.state[key];
    }

    // Set initial state
    Object.assign(store.state, initialState);

    // Clear persisted state
    if (store.persist) {
      const key = `state_${storeName}`;
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all stores
   */
  clearAllStores() {
    for (const storeName of Object.keys(this.stores)) {
      const store = this.stores[storeName];

      // Clear state
      for (const key of Object.keys(store.state)) {
        delete store.state[key];
      }

      // Clear persisted state
      if (store.persist) {
        const key = `state_${storeName}`;
        localStorage.removeItem(key);
      }
    }
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;
