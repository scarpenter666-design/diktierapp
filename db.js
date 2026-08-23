// IndexedDB-Wrapper fuer lokale Eintraege
const DB_NAME = 'diktierapp';
const STORE = 'entries';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result ?? null);
    t.onerror = () => reject(t.error);
  });
}

export async function saveEntry(entry) {
  entry.createdAt = Date.now();
  return tx('readwrite', (s) => s.add(entry));
}

export async function listEntries() {
  return tx('readonly', (s) => s.getAll()) || [];
}

export async function getEntry(id) {
  return tx('readonly', (s) => s.get(id));
}

export async function deleteEntry(id) {
  return tx('readwrite', (s) => s.delete(id));
}

export async function clearAll() {
  return tx('readwrite', (s) => s.clear());
}
