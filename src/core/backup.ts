// Backup file format (JSON) and validation. Binary assets are carried as data URLs.
import type { Collection, PronunciationOverride, Song } from "@/types";

export const BACKUP_APP = "otoyomi";
export const BACKUP_VERSION = 1;

export interface BackupAsset {
  id: string;
  dataUrl: string;
  createdAt: number;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  songs: Song[];
  collections: Collection[];
  pronunciation: PronunciationOverride[];
  settings: unknown;
  assets: BackupAsset[];
}

export function buildBackup(
  data: Omit<BackupFile, "app" | "version" | "exportedAt">,
  now: number,
): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now, ...data };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";

function isSong(v: unknown): v is Song {
  return isObj(v) && isStr(v["id"]) && isStr(v["title"]) && Array.isArray(v["lines"]);
}
function isCollection(v: unknown): v is Collection {
  return isObj(v) && isStr(v["id"]) && isStr(v["name"]) && Array.isArray(v["songIds"]);
}
function isRule(v: unknown): v is PronunciationOverride {
  return isObj(v) && isStr(v["romaji"]) && isStr(v["singAlong"]);
}
function isAsset(v: unknown): v is BackupAsset {
  return isObj(v) && isStr(v["id"]) && isStr(v["dataUrl"]) && v["dataUrl"].startsWith("data:");
}

export type BackupParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "文件不是有效的 JSON" };
  }
  if (!isObj(raw) || raw["app"] !== BACKUP_APP) return { ok: false, error: "这不是音咏的备份文件" };
  if (typeof raw["version"] !== "number" || raw["version"] > BACKUP_VERSION)
    return { ok: false, error: "备份版本不受支持，请升级应用" };
  const arr = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as unknown[]) : []);
  const songs = arr("songs");
  const collections = arr("collections");
  const pronunciation = arr("pronunciation");
  const assets = arr("assets");
  if (
    !songs.every(isSong) ||
    !collections.every(isCollection) ||
    !pronunciation.every(isRule) ||
    !assets.every(isAsset)
  ) {
    return { ok: false, error: "备份内容已损坏" };
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: raw["version"],
      exportedAt: typeof raw["exportedAt"] === "number" ? raw["exportedAt"] : 0,
      songs: songs.map((s) => ({
        ...s,
        backgroundAssetId: s.backgroundAssetId ?? null,
        lastPracticedAt: s.lastPracticedAt ?? null,
      })),
      collections,
      pronunciation,
      settings: raw["settings"] ?? null,
      assets,
    },
  };
}
