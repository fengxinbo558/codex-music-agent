import type { MusicAsset } from "../types";

const DEFAULT_DATABASE_NAME = "codex-music-audio-library";
const DATABASE_VERSION = 1;
const ASSET_STORE = "assets";
const BLOB_STORE = "blobs";

type StoredBlob = { id: string; blob: Blob };

export class LocalAudioStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly databaseName = DEFAULT_DATABASE_NAME,
    private readonly factory: IDBFactory | undefined = globalThis.indexedDB,
  ) {}

  async save(asset: MusicAsset, blob: Blob) {
    const database = await this.open();
    const transaction = database.transaction(
      [ASSET_STORE, BLOB_STORE],
      "readwrite",
    );
    transaction.objectStore(ASSET_STORE).put(asset);
    transaction.objectStore(BLOB_STORE).put({ id: asset.localBlobKey, blob });
    await transactionDone(transaction);
  }

  async putAsset(asset: MusicAsset) {
    const database = await this.open();
    const transaction = database.transaction(ASSET_STORE, "readwrite");
    transaction.objectStore(ASSET_STORE).put(asset);
    await transactionDone(transaction);
  }

  async listAssets(): Promise<MusicAsset[]> {
    const database = await this.open();
    const transaction = database.transaction(ASSET_STORE, "readonly");
    const request = transaction.objectStore(ASSET_STORE).getAll();
    const assets = await requestResult<MusicAsset[]>(request);
    await transactionDone(transaction);
    return assets.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async getBlob(asset: Pick<MusicAsset, "localBlobKey">) {
    const database = await this.open();
    const transaction = database.transaction(BLOB_STORE, "readonly");
    const request = transaction
      .objectStore(BLOB_STORE)
      .get(asset.localBlobKey);
    const stored = await requestResult<StoredBlob | undefined>(request);
    await transactionDone(transaction);
    return stored?.blob;
  }

  async delete(asset: Pick<MusicAsset, "id" | "localBlobKey">) {
    await this.deleteMany([asset]);
  }

  async deleteMany(assets: Array<Pick<MusicAsset, "id" | "localBlobKey">>) {
    if (!assets.length) return;
    const database = await this.open();
    const transaction = database.transaction(
      [ASSET_STORE, BLOB_STORE],
      "readwrite",
    );
    for (const asset of assets) {
      transaction.objectStore(ASSET_STORE).delete(asset.id);
      transaction.objectStore(BLOB_STORE).delete(asset.localBlobKey);
    }
    await transactionDone(transaction);
  }

  close() {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }

  private open() {
    if (!this.factory) {
      return Promise.reject(
        new Error("当前环境不支持本机音频库，音频没有被假装保存。"),
      );
    }
    if (!this.databasePromise) {
      this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.factory!.open(this.databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(ASSET_STORE)) {
            database.createObjectStore(ASSET_STORE, { keyPath: "id" });
          }
          if (!database.objectStoreNames.contains(BLOB_STORE)) {
            database.createObjectStore(BLOB_STORE, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(new Error("本机音频库正在被另一个窗口占用，请关闭旧窗口后重试。"));
      });
    }
    return this.databasePromise;
  }
}

export const localAudioStore = new LocalAudioStore();

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
