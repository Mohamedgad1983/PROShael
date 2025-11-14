// IndexedDB Manager for Offline Data Storage
// src/utils/indexedDBManager.js
import { logger } from './logger';


const DB_NAME = 'AlShuailDB';
const DB_VERSION = 1;
const STORES = {
  members: 'members',
  payments: 'payments',
  initiatives: 'initiatives',
  offlineQueue: 'offlineQueue',
};

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.members)) {
          const membersStore = db.createObjectStore(STORES.members, {
            keyPath: 'id',
            autoIncrement: true,
          });
          membersStore.createIndex('member_id', 'member_id', { unique: false });
          membersStore.createIndex('phone', 'phone', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.payments)) {
          const paymentsStore = db.createObjectStore(STORES.payments, {
            keyPath: 'id',
            autoIncrement: true,
          });
          paymentsStore.createIndex('payer_id', 'payer_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.initiatives)) {
          db.createObjectStore(STORES.initiatives, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains(STORES.offlineQueue)) {
          const queueStore = db.createObjectStore(STORES.offlineQueue, {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addData(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.add(data);
  }

  async getData(storeName, key) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return store.get(key);
  }

  async getAllData(storeName) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return store.getAll();
  }

  async updateData(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.put(data);
  }

  async deleteData(storeName, key) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.delete(key);
  }

  async clearStore(storeName) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.clear();
  }

  // Add to offline queue
  async addToOfflineQueue(request) {
    const queueItem = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      timestamp: Date.now(),
    };

    return this.addData(STORES.offlineQueue, queueItem);
  }

  // Sync offline queue
  async syncOfflineQueue() {
    const items = await this.getAllData(STORES.offlineQueue);

    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        await this.deleteData(STORES.offlineQueue, item.id);
      } catch (error) {
        logger.error('Failed to sync item:', { error });
      }
    }
  }
}

export const dbManager = new IndexedDBManager();
export { STORES };
