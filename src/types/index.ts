// Shared domain types. Pure data — no runtime dependencies.

export enum LyricIssue {
  ORIGINAL_ONLY = "ORIGINAL_ONLY",
  ROMAJI_ONLY = "ROMAJI_ONLY",
  POSSIBLE_MISMATCH = "POSSIBLE_MISMATCH",
  NEEDS_CONFIRMATION = "NEEDS_CONFIRMATION",
}

export interface LyricLine {
  position: number;
  timestampMs: number | null;
  japanese: string;
  romaji: string;
  singAlong: string;
  issues: LyricIssue[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  source: string;
  sourceId: string | null;
  lines: LyricLine[];
  updatedAt: number;
  lastPracticedAt: number | null;
  /** Id of a Blob stored in the assets store; resolved to an ObjectURL at runtime. */
  backgroundAssetId: string | null;
}

export interface Collection {
  id: string;
  name: string;
  songIds: string[];
  updatedAt: number;
}

export interface SongDraft {
  title: string;
  artist: string;
  album: string;
  source: string;
  sourceId: string | null;
  lines: LyricLine[];
}

export interface LyricsInput {
  title: string;
  artist: string;
  album?: string;
  japanese?: string;
  romaji?: string;
  source?: string;
  sourceId?: string | null;
}

export interface StructuredLyricLineInput {
  timestampMs?: number | null;
  japanese?: string;
  romaji?: string;
  singAlong?: string;
}

export interface StructuredLyricsInput {
  title?: string;
  artist?: string;
  album?: string;
  source?: string;
  lines?: StructuredLyricLineInput[];
}

/** One user rule in the personal pronunciation dictionary: romaji syllable -> sing-along text. */
export interface PronunciationOverride {
  romaji: string;
  singAlong: string;
}

/** Result contract returned by the AI structured-import service. */
export interface ImportStructureResult {
  title: string;
  artist: string;
  album: string;
  lines: StructuredLyricLineInput[];
  warnings: string[];
}
