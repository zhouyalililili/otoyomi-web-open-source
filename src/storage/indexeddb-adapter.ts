// IndexedDB implementation. Browser-only: construct inside effects / event handlers / queries, never during SSR.
import type { Collection, PronunciationOverride, Song } from "@/types";
import type { IStorageAdapter, StoredAsset } from "./storage-adapter";

const DB_NAME = "otoyomi";
const DB_VERSION = 3;
const STORES = {
  songs: "id",
  collections: "id",
  pronunciation: "romaji",
  assets: "id",
  settings: "key",
} as const;
type StoreName = keyof typeof STORES;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class IndexedDbStorageAdapter implements IStorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const open = indexedDB.open(DB_NAME, DB_VERSION);
        open.onupgradeneeded = () => {
          for (const [name, keyPath] of Object.entries(STORES)) {
            if (!open.result.objectStoreNames.contains(name))
              open.result.createObjectStore(name, { keyPath });
          }
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
    }
    return this.dbPromise;
  }

  private async store(name: StoreName, mode: IDBTransactionMode) {
    return (await this.db()).transaction(name, mode).objectStore(name);
  }
  private async all<T>(name: StoreName) {
    return req((await this.store(name, "readonly")).getAll()) as Promise<T[]>;
  }
  private async one<T>(name: StoreName, key: string) {
    return req((await this.store(name, "readonly")).get(key)) as Promise<T | undefined>;
  }
  private async put(name: StoreName, value: unknown) {
    await req((await this.store(name, "readwrite")).put(value));
  }
  private async del(name: StoreName, key: string) {
    await req((await this.store(name, "readwrite")).delete(key));
  }

  listSongs = () => this.all<Song>("songs");
  getSong = (id: string) => this.one<Song>("songs", id);
  putSong = (s: Song) => this.put("songs", s);
  deleteSong = (id: string) => this.del("songs", id);
  listCollections = () => this.all<Collection>("collections");
  getCollection = (id: string) => this.one<Collection>("collections", id);
  putCollection = (c: Collection) => this.put("collections", c);
  deleteCollection = (id: string) => this.del("collections", id);
  putAsset = (a: StoredAsset) => this.put("assets", a);
  getAsset = (id: string) => this.one<StoredAsset>("assets", id);
  deleteAsset = (id: string) => this.del("assets", id);
  listAssets = () => this.all<StoredAsset>("assets");
  getSettings = async () =>
    (await this.one<{ key: string; value: unknown }>("settings", "app"))?.value ?? null;
  putSettings = (value: unknown) => this.put("settings", { key: "app", value });
  clearAll = async () => {
    const db = await this.db();
    const names = Object.keys(STORES);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(names, "readwrite");
      names.forEach((n) => tx.objectStore(n).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };
  listPronunciationOverrides = () => this.all<PronunciationOverride>("pronunciation");
  putPronunciationOverride = (r: PronunciationOverride) => this.put("pronunciation", r);
  deletePronunciationOverride = (romaji: string) => this.del("pronunciation", romaji);
}
