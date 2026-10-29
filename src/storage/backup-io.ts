// Export/import of the whole local library via the core backup format. Browser-only.
import { buildBackup, parseBackup, type BackupFile } from "@/core";
import type { IStorageAdapter } from "./storage-adapter";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export async function exportBackup(storage: IStorageAdapter): Promise<BackupFile> {
  const [songs, collections, pronunciation, settings, assets] = await Promise.all([
    storage.listSongs(),
    storage.listCollections(),
    storage.listPronunciationOverrides(),
    storage.getSettings(),
    storage.listAssets(),
  ]);
  const used = new Set(songs.map((s) => s.backgroundAssetId).filter(Boolean));
  const encoded = await Promise.all(
    assets
      .filter((a) => used.has(a.id))
      .map(async (a) => ({
        id: a.id,
        createdAt: a.createdAt,
        dataUrl: await blobToDataUrl(a.blob),
      })),
  );
  return buildBackup({ songs, collections, pronunciation, settings, assets: encoded }, Date.now());
}

export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Restore merges by id: existing items with the same id are overwritten, others are kept. */
export async function importBackup(
  storage: IStorageAdapter,
  text: string,
): Promise<{ songs: number; collections: number; rules: number }> {
  const parsed = parseBackup(text);
  if (!parsed.ok) throw new Error(parsed.error);
  const b = parsed.backup;
  for (const a of b.assets)
    await storage.putAsset({
      id: a.id,
      createdAt: a.createdAt,
      blob: await dataUrlToBlob(a.dataUrl),
    });
  for (const s of b.songs) await storage.putSong(s);
  for (const c of b.collections) await storage.putCollection(c);
  for (const r of b.pronunciation) await storage.putPronunciationOverride(r);
  if (b.settings) await storage.putSettings(b.settings);
  return {
    songs: b.songs.length,
    collections: b.collections.length,
    rules: b.pronunciation.length,
  };
}
