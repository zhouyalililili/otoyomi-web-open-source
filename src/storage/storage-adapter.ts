import type { Collection, PronunciationOverride, Song } from "@/types";

export interface StoredAsset {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface IStorageAdapter {
  listSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  putSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;

  listCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  putCollection(collection: Collection): Promise<void>;
  deleteCollection(id: string): Promise<void>;

  putAsset(asset: StoredAsset): Promise<void>;
  getAsset(id: string): Promise<StoredAsset | undefined>;
  deleteAsset(id: string): Promise<void>;
  listAssets(): Promise<StoredAsset[]>;

  getSettings(): Promise<unknown>;
  putSettings(value: unknown): Promise<void>;

  /** Wipe every store (songs, collections, assets, dictionary, settings). */
  clearAll(): Promise<void>;

  listPronunciationOverrides(): Promise<PronunciationOverride[]>;
  putPronunciationOverride(rule: PronunciationOverride): Promise<void>;
  deletePronunciationOverride(romaji: string): Promise<void>;
}
