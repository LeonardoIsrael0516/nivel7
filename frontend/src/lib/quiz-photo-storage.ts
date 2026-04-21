const DB_NAME = "nivel7-quiz";
const STORE_NAME = "session";
const DB_VERSION = 1;
const PHOTOS_KEY = "uploadPhotos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexeddb_open_failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveQuizPhotos(photos: string[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb_tx_failed"));
      tx.objectStore(STORE_NAME).put(photos, PHOTOS_KEY);
    });
    db.close();
  } catch {
    // IndexedDB unavailable or failed; photos stay in memory only
  }
}

export async function loadQuizPhotos(): Promise<string[]> {
  try {
    const db = await openDb();
    const photos = await new Promise<string[] | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb_read_failed"));
      const req = tx.objectStore(STORE_NAME).get(PHOTOS_KEY);
      req.onsuccess = () => resolve(req.result as string[] | undefined);
    });
    db.close();
    return Array.isArray(photos) ? photos : [];
  } catch {
    return [];
  }
}

export async function clearQuizPhotos(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb_clear_failed"));
      tx.objectStore(STORE_NAME).delete(PHOTOS_KEY);
    });
    db.close();
  } catch {
    // ignore
  }
}
