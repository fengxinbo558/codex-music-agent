import type { CreationSession } from "../types";

const DATABASE_NAME = "music-creation-sessions";
const DATABASE_VERSION = 1;
const SESSION_STORE = "sessions";

export class CreationSessionStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly databaseName = DATABASE_NAME,
    private readonly factory: IDBFactory | undefined = globalThis.indexedDB,
  ) {}

  async save(session: CreationSession) {
    const database = await this.open();
    const transaction = database.transaction(SESSION_STORE, "readwrite");
    transaction.objectStore(SESSION_STORE).put(session);
    await transactionDone(transaction);
  }

  async get(id: string): Promise<CreationSession | undefined> {
    const database = await this.open();
    const transaction = database.transaction(SESSION_STORE, "readonly");
    const request = transaction.objectStore(SESSION_STORE).get(id);
    const session = await requestResult<CreationSession | undefined>(request);
    await transactionDone(transaction);
    return session;
  }

  async getLatest(projectId: string): Promise<CreationSession | undefined> {
    const database = await this.open();
    const transaction = database.transaction(SESSION_STORE, "readonly");
    const request = transaction.objectStore(SESSION_STORE).getAll();
    const sessions = await requestResult<CreationSession[]>(request);
    await transactionDone(transaction);
    return sessions
      .filter((session) => session.projectId === projectId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  }

  close() {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }

  private open() {
    if (!this.factory) {
      return Promise.reject(new Error("当前环境无法保存创作进度。"));
    }
    if (!this.databasePromise) {
      this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.factory!.open(this.databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(SESSION_STORE)) {
            database.createObjectStore(SESSION_STORE, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(new Error("创作进度正在被另一个窗口占用。"));
      });
    }
    return this.databasePromise;
  }
}

export const creationSessionStore = new CreationSessionStore();

function requestResult<Value>(request: IDBRequest<Value>) {
  return new Promise<Value>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
