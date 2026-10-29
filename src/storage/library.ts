// Library use-cases built only on IStorageAdapter.
import type { Collection, Song, SongDraft } from "@/types";
import { IndexedDbStorageAdapter } from "./indexeddb-adapter";
import type { IStorageAdapter } from "./storage-adapter";

let instance: IStorageAdapter | null = null;
/** Browser-only singleton. */
export function getStorage(): IStorageAdapter {
  if (typeof indexedDB === "undefined") throw new Error("当前环境不支持本地存储");
  instance ??= new IndexedDbStorageAdapter();
  return instance;
}

export const newId = () => crypto.randomUUID();

export async function saveDraftAsSong(
  storage: IStorageAdapter,
  draft: SongDraft,
  collectionId?: string | null,
): Promise<Song> {
  const song: Song = {
    ...draft,
    id: newId(),
    updatedAt: Date.now(),
    lastPracticedAt: null,
    backgroundAssetId: null,
  };
  await storage.putSong(song);
  if (collectionId) await addSongsToCollection(storage, collectionId, [song.id]);
  return song;
}

export async function addSongsToCollection(
  storage: IStorageAdapter,
  collectionId: string,
  songIds: string[],
) {
  const c = await storage.getCollection(collectionId);
  if (!c) return;
  const ids = [...c.songIds, ...songIds.filter((id) => !c.songIds.includes(id))];
  await storage.putCollection({ ...c, songIds: ids, updatedAt: Date.now() });
}

export async function deleteSongCascade(storage: IStorageAdapter, id: string) {
  const song = await storage.getSong(id);
  if (song?.backgroundAssetId) await storage.deleteAsset(song.backgroundAssetId);
  for (const c of await storage.listCollections()) {
    if (c.songIds.includes(id))
      await storage.putCollection({
        ...c,
        songIds: c.songIds.filter((s) => s !== id),
        updatedAt: Date.now(),
      });
  }
  await storage.deleteSong(id);
}

/** Store a background image Blob and point the song at it; the previous asset is removed. */
export async function setSongBackground(
  storage: IStorageAdapter,
  song: Song,
  file: Blob | null,
): Promise<Song> {
  const old = song.backgroundAssetId;
  let backgroundAssetId: string | null = null;
  if (file) {
    backgroundAssetId = newId();
    await storage.putAsset({ id: backgroundAssetId, blob: file, createdAt: Date.now() });
  }
  const next = { ...song, backgroundAssetId, updatedAt: Date.now() };
  await storage.putSong(next);
  if (old) await storage.deleteAsset(old);
  return next;
}

export function createCollection(name: string, songIds: string[]): Collection {
  return { id: newId(), name: name.trim(), songIds, updatedAt: Date.now() };
}

/** Recent practice order: lastPracticedAt desc, never-practiced songs after by updatedAt desc. */
export function sortByRecentPractice(songs: Song[]): Song[] {
  return [...songs].sort((a, b) => {
    if (a.lastPracticedAt !== b.lastPracticedAt)
      return (b.lastPracticedAt ?? -1) - (a.lastPracticedAt ?? -1);
    return b.updatedAt - a.updatedAt;
  });
}
