// Local cleaning, classification and layout detection for imports. Pure TS.
import type { StructuredLyricLineInput, StructuredLyricsInput } from "@/types";
import { LrcParser } from "./lrc-parser";
import { classify, LineKind, LyricsPairing } from "./lyrics-pairing";
import { kotlinLines } from "./text";

export type SingleKind = "original" | "romaji";

const NOISE_PATTERNS: RegExp[] = [
  /^(作词|作詞|作曲|编曲|編曲|词|詞|曲|歌|唱|vocal|lyrics?|music|arrange[dr]?|composer|lyricist)\s*[:：]/i,
  /^\[(ar|ti|al|by|offset|re|ve|length):.*]$/i,
  /^[-=_*~♪♫・·.。、\s]+$/,
];

export interface CleanResult {
  lines: string[];
  removed: string[];
}

/** Strip BOM / zero-width chars, normalise spaces, drop blank and credit/noise lines. */
export function cleanLyricsText(raw: string): CleanResult {
  const lines: string[] = [];
  const removed: string[] = [];
  for (const rawLine of kotlinLines(raw)) {
    const line = rawLine
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
      .replace(/\u3000/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!line) continue;
    if (NOISE_PATTERNS.some((p) => p.test(line))) removed.push(line);
    else lines.push(line);
  }
  return { lines, removed };
}

const TIMESTAMP = /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?]/g;
export const hasLrcTimestamps = (text: string) => /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?]/.test(text);
export const stripTimestamps = (line: string) => line.replace(TIMESTAMP, "").trim();

export interface KindStats {
  original: number;
  romaji: number;
  unknown: number;
}

export function kindStats(lines: string[]): KindStats {
  const s: KindStats = { original: 0, romaji: 0, unknown: 0 };
  for (const l of lines) {
    const k = classify(l);
    if (k === LineKind.ORIGINAL) s.original++;
    else if (k === LineKind.ROMAJI) s.romaji++;
    else s.unknown++;
  }
  return s;
}

/**
 * Normalised (single-language) import check. Original lyrics may contain a few
 * English lines, so "original" is mixed only when romaji lines reach max(2, 20%).
 * Romaji imports must contain no Japanese characters at all.
 */
export function detectMixed(lines: string[], expected: SingleKind): boolean {
  const s = kindStats(lines);
  if (expected === "romaji") return s.original > 0;
  return s.original > 0 && s.romaji >= Math.max(2, Math.ceil(lines.length * 0.2));
}

export type SmartLayout =
  | "empty"
  | "original-only"
  | "romaji-only"
  | "alternating"
  | "split-blocks"
  | "lrc-paired"
  | "needs-ai";

export interface SmartAnalysis {
  layout: SmartLayout;
  cleanedLines: string[];
  removedLines: string[];
  stats: KindStats;
  hasTimestamps: boolean;
  /** Present when local analysis is confident; otherwise the AI service is required. */
  structured: StructuredLyricsInput | null;
}

function kindsOf(lines: string[]): LineKind[] {
  return lines.map(classify);
}

function analyzeLrc(lines: string[]): StructuredLyricLineInput[] | null {
  const parsed = LrcParser.parse(lines.join("\n"));
  const result: StructuredLyricLineInput[] = [];
  let i = 0;
  while (i < parsed.length) {
    const ts = parsed[i]!.timestampMs;
    const group: string[] = [];
    while (i < parsed.length && parsed[i]!.timestampMs === ts) group.push(parsed[i++]!.text);
    const originals = group.filter((g) => classify(g) !== LineKind.ROMAJI);
    const romajis = group.filter((g) => classify(g) === LineKind.ROMAJI);
    if (originals.length > 1 || romajis.length > 1) return null;
    result.push({ timestampMs: ts, japanese: originals[0] ?? "", romaji: romajis[0] ?? "" });
  }
  return result;
}

export function analyzeSmartImport(raw: string): SmartAnalysis {
  const { lines, removed } = cleanLyricsText(raw);
  const timed = hasLrcTimestamps(lines.join("\n"));
  const texts = lines.map(stripTimestamps).filter(Boolean);
  const stats = kindStats(texts);
  const base = { cleanedLines: lines, removedLines: removed, stats, hasTimestamps: timed };
  const out = (
    layout: SmartLayout,
    structuredLines: StructuredLyricLineInput[] | null,
  ): SmartAnalysis => ({
    ...base,
    layout,
    structured: structuredLines ? { source: "smart", lines: structuredLines } : null,
  });

  if (!texts.length) return out("empty", null);

  if (timed) {
    const paired = analyzeLrc(lines);
    if (
      paired &&
      (stats.original === 0 || stats.romaji === 0 || paired.length * 2 <= texts.length + 1)
    ) {
      return out("lrc-paired", paired);
    }
    return out("needs-ai", null);
  }

  if (stats.romaji === 0)
    return out(
      "original-only",
      texts.map((t) => ({ japanese: t })),
    );
  if (stats.original === 0)
    return out(
      "romaji-only",
      texts.map((t) => ({ romaji: t })),
    );

  const kinds = kindsOf(texts);
  // Split blocks: originals first, then romaji, exactly one switch.
  const switches = kinds.slice(1).filter((k, i) => k !== kinds[i]).length;
  if (switches === 1 && kinds[0] !== LineKind.ROMAJI && stats.unknown === 0) {
    const split = kinds.indexOf(LineKind.ROMAJI);
    const pairs = LyricsPairing.splitLines(
      texts.slice(0, split).join("\n"),
      texts.slice(split).join("\n"),
    );
    return out(
      "split-blocks",
      pairs.map(([japanese, romaji]) => ({ japanese, romaji })),
    );
  }

  // Alternating: original followed by romaji covers >= 80% of lines.
  let paired = 0;
  for (let i = 0; i + 1 < kinds.length; i++) {
    if (kinds[i] === LineKind.ORIGINAL && kinds[i + 1] === LineKind.ROMAJI) {
      paired += 2;
      i++;
    }
  }
  if (paired >= texts.length * 0.8) {
    const pairs = LyricsPairing.alternatingLines(texts.join("\n"));
    return out(
      "alternating",
      pairs.map(([japanese, romaji]) => ({ japanese, romaji })),
    );
  }

  return out("needs-ai", null);
}
