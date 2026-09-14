const databaseName = "learncraft-learning-cache";
const databaseVersion = 1;
const sessionStore = "sessions";

export const learningSessionTtlMs = 24 * 60 * 60 * 1000;

type StoredLearningSession<T> = {
  ownerId: string;
  value: T;
  updatedAt: number;
  expiresAt: number;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed")), { once: true });
  });
}

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable"));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(sessionStore)) {
        const store = database.createObjectStore(sessionStore, { keyPath: "ownerId" });
        store.createIndex("expiresAt", "expiresAt");
      }
    });
    request.addEventListener("success", () => {
      request.result.addEventListener("versionchange", () => {
        request.result.close();
        databasePromise = null;
      });
      resolve(request.result);
    }, { once: true });
    request.addEventListener("error", () => {
      databasePromise = null;
      reject(request.error ?? new Error("IndexedDB open failed"));
    }, { once: true });
  });
  return databasePromise;
}

async function removeExpiredSessions(database: IDBDatabase, now: number) {
  const transaction = database.transaction(sessionStore, "readwrite");
  const done = transactionDone(transaction);
  const index = transaction.objectStore(sessionStore).index("expiresAt");
  const cursorRequest = index.openCursor(IDBKeyRange.upperBound(now));
  await new Promise<void>((resolve, reject) => {
    cursorRequest.addEventListener("success", () => {
      const cursor = cursorRequest.result;
      if (!cursor) { resolve(); return; }
      cursor.delete();
      cursor.continue();
    });
    cursorRequest.addEventListener("error", () => reject(cursorRequest.error ?? new Error("IndexedDB cleanup failed")), { once: true });
  });
  await done;
}

export async function readLearningSession<T>(ownerId: string): Promise<T | null> {
  const database = await openDatabase();
  const now = Date.now();
  await removeExpiredSessions(database, now);
  const transaction = database.transaction(sessionStore, "readonly");
  const done = transactionDone(transaction);
  const record = await requestResult(transaction.objectStore(sessionStore).get(ownerId)) as StoredLearningSession<T> | undefined;
  await done;
  return record && record.expiresAt > now ? record.value : null;
}

export async function writeLearningSession<T>(ownerId: string, value: T) {
  const database = await openDatabase();
  const now = Date.now();
  const transaction = database.transaction(sessionStore, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(sessionStore).put({
    ownerId,
    value,
    updatedAt: now,
    expiresAt: now + learningSessionTtlMs,
  } satisfies StoredLearningSession<T>);
  await done;
}

export async function clearLearningSessions() {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  const transaction = database.transaction(sessionStore, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(sessionStore).clear();
  await done;
}
