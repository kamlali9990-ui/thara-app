const DB_NAME = 'thara_app';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const data = req.result;
          if (data !== undefined) {
            resolve(JSON.parse(data));
          } else {
            const fallback = localStorage.getItem(key);
            resolve(fallback ? JSON.parse(fallback) : null);
          }
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.error('storage.get fallback to localStorage', e);
      const fallback = localStorage.getItem(key);
      return fallback ? JSON.parse(fallback) : null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(JSON.stringify(value), key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.error('storage.set fallback to localStorage', e);
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.error('storage.remove fallback to localStorage', e);
      localStorage.removeItem(key);
    }
  }
};

export async function migrateLegacyData(): Promise<void> {
  const keys = ['thara_products', 'thara_orders', 'thara_chat'];
  for (const key of keys) {
    const local = localStorage.getItem(key);
    if (local) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(local, key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}
