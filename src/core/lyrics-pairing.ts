// Port of LyricsPairing.kt
import { LyricIssue } from "@/types";
import { kotlinLines } from "./text";

export enum LineKind {
  ORIGINAL = "ORIGINAL",
  ROMAJI = "ROMAJI",
  UNKNOWN = "UNKNOWN",
}

export type LinePair = [original: string, romaji: string];

const isJapaneseCharacter = (c: number) =>
  (c >= 0x3040 && c <= 0x30ff) || (c >= 0x3400 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff);

export function classify(line: string): LineKind {
  for (let i = 0; i < line.length; i++)
    if (isJapaneseCharacter(line.charCodeAt(i))) return LineKind.ORIGINAL;
  if (/[A-Za-z]/.test(line)) return LineKind.ROMAJI;
  return LineKind.UNKNOWN;
}

function meaningfulLines(value: string, preserveInternalBlanks: boolean): string[] {
  const lines = kotlinLines(value).map((l) => l.trim());
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return preserveInternalBlanks ? lines : lines.filter((l) => l !== "");
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ā/g, "aa")
    .replace(/ī/g, "ii")
    .replace(/ū/g, "uu")
    .replace(/ē/g, "ee")
    .replace(/ō/g, "ou")
    .replace(/shi/g, "si")
    .replace(/chi/g, "ti")
    .replace(/tsu/g, "tu")
    .replace(/fu/g, "hu")
    .replace(/[^a-z]/g, "");
}

/** 1 - levenshtein / maxLength */
export function similarity(first: string, second: string): number {
  if (!first.length || !second.length) return 0;
  const previous = Array.from({ length: second.length + 1 }, (_, i) => i);
  for (let fi = 0; fi < first.length; fi++) {
    let diagonal = previous[0]!;
    previous[0] = fi + 1;
    for (let si = 0; si < second.length; si++) {
      const old = previous[si + 1]!;
      previous[si + 1] = Math.min(
        previous[si + 1]! + 1,
        previous[si]! + 1,
        diagonal + (first[fi] === second[si] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return 1 - previous[previous.length - 1]! / Math.max(first.length, second.length);
}

export const LyricsPairing = {
  splitLines(japanese: string, romaji: string): LinePair[] {
    const originals = meaningfulLines(japanese, true);
    const romanized = meaningfulLines(romaji, true);
    const out: LinePair[] = [];
    for (let i = 0; i < Math.max(originals.length, romanized.length); i++) {
      const o = originals[i] ?? "";
      const r = romanized[i] ?? "";
      if (!(o.trim() === "" && r.trim() === "")) out.push([o, r]);
    }
    return out;
  },

  alternatingLines(content: string): LinePair[] {
    const result: LinePair[] = [];
    let pending: string | null = null;
    for (const line of kotlinLines(content)
      .map((l) => l.trim())
      .filter((l) => l !== "")) {
      switch (classify(line)) {
        case LineKind.ORIGINAL:
          if (pending !== null) result.push([pending, ""]);
          pending = line;
          break;
        case LineKind.ROMAJI:
          result.push([pending ?? "", line]);
          pending = null;
          break;
        case LineKind.UNKNOWN:
          if (pending !== null) result.push([pending, ""]);
          result.push([line, ""]);
          pending = null;
          break;
      }
    }
    if (pending !== null) result.push([pending, ""]);
    return result;
  },

  issuesFor(original: string, suppliedRomaji: string, generatedRomaji: string): LyricIssue[] {
    const blank = (s: string) => s.trim() === "";
    if (blank(original) && blank(suppliedRomaji)) return [LyricIssue.NEEDS_CONFIRMATION];
    if (blank(original)) return [LyricIssue.ROMAJI_ONLY];
    if (blank(suppliedRomaji)) return [LyricIssue.ORIGINAL_ONLY];
    if (blank(generatedRomaji)) return [LyricIssue.NEEDS_CONFIRMATION];
    return similarity(normalize(generatedRomaji), normalize(suppliedRomaji)) < 0.42
      ? [LyricIssue.POSSIBLE_MISMATCH]
      : [];
  },
};
