// Cola offline (S6-03): IndexedDB "outbox" para mutaciones sin red.
// Encola operaciones POST/PUT/PATCH/DELETE y las sincroniza al volver a
// estar en línea, con reintentos exponenciales.

const DB_NAME = "contabilidad-offline";
const DB_VERSION = 1;
const STORE = "outbox";

export interface QueuedOp {
  id?: number;
  url: string;
  method: string;
  body?: string;
  createdAt: number;
  attempts: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        const store = req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function enqueueOp(op: Omit<QueuedOp, "createdAt" | "attempts">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add({ ...op, createdAt: Date.now(), attempts: 0 } as QueuedOp);
    req.onsuccess = () => resolve(Number(req.result));
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedOps(): Promise<QueuedOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedOp[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOp(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateOpAttempts(op: QueuedOp): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put({ ...op, attempts: op.attempts + 1 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface ProcessResult {
  synced: number;
  dropped: number;
  pending: number;
}

export function processQueue(): Promise<ProcessResult> {
  if (!isOnline() || typeof indexedDB === "undefined") {
    return Promise.resolve({ synced: 0, dropped: 0, pending: 0 });
  }
  return getQueuedOps().then(async (ops) => {
    const result: ProcessResult = { synced: 0, dropped: 0, pending: 0 };
    for (const op of ops) {
      if (!isOnline()) {
        result.pending = ops.length - result.synced - result.dropped;
        scheduleRetry();
        return result;
      }
      try {
        const res = await fetch(op.url, {
          method: op.method,
          headers: { "Content-Type": "application/json" },
          body: op.body,
        });
        if (res.ok || res.status >= 400 && res.status < 500) {
          // 2xx → sincronizada; 4xx → conflicto de datos, descartar para no repetir
          if (op.id !== undefined) await deleteOp(op.id);
          res.ok ? result.synced++ : result.dropped++;
        } else {
          // 5xx: reintentar más tarde
          result.pending++;
          scheduleRetry();
          return result;
        }
      } catch {
        // Error de red: reintentar con backoff
        result.pending++;
        if (op.id !== undefined) await updateOpAttempts(op);
        scheduleRetry();
        return result;
      }
    }
    return result;
  });
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    processQueue();
  }, 10_000);
}

export function initOfflineSync(): void {
  if (typeof window === "undefined") return;
  const run = () => {
    processQueue().then((res) => {
      if (res.synced > 0) {
        window.dispatchEvent(new CustomEvent("offline-sync", { detail: res }));
      }
    });
  };
  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });
  // Procesar al arrancar (por si quedaron operaciones pendientes)
  run();
}

export function getOfflineCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return Promise.resolve(0);
  return getQueuedOps().then((ops) => ops.length);
}
