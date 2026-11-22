// Tiny IndexedDB wrapper so the pantry and dishes survive a reload.
const DB = 'memory-kitchen';
const VERSION = 1;

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pantry')) db.createObjectStore('pantry', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('dishes')) db.createObjectStore('dishes', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(name, mode, fn) {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);
      const out = fn(store);
      tx.oncomplete = () => resolve(out?.result ?? out);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  }
}

export const storage = {
  async all(name) {
    const res = await withStore(name, 'readonly', (s) => s.getAll());
    return Array.isArray(res) ? res : [];
  },
  put(name, item) { return withStore(name, 'readwrite', (s) => s.put(item)); },
  del(name, id) { return withStore(name, 'readwrite', (s) => s.delete(id)); },
  clear(name) { return withStore(name, 'readwrite', (s) => s.clear()); },
};
