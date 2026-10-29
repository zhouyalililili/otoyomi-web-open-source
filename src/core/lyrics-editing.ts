// Pure helpers for the lyric editor and normalised imports.
import type { LyricLine, LyricsInput, SongDraft, StructuredLyricLineInput } from "@/types";
import type { JapaneseRomanizer } from "./japanese-romanizer";
import { LyricsAssembler } from "./lyrics-assembler";
import { LyricsPairing } from "./lyrics-pairing";
import { nonBlankLines } from "./text";
import { hasLrcTimestamps, type SingleKind } from "./import-cleaning";
import { LrcParser } from "./lrc-parser";

export interface EditableLine {
  timestampMs: number | null;
  japanese: string;
  romaji: string;
  singAlong: string;
}

const blank = (s: string) => s.trim() === "";

/** Drop rows whose three layers are all blank, reindex, and recompute diagnostics. */
export function finalizeEditedLines(
  rows: EditableLine[],
  romanizer: Pick<JapaneseRomanizer, "romanizeLine">,
  convertSingAlong: (romaji: string) => string = () => "",
): LyricLine[] {
  return rows
    .filter((r) => !(blank(r.japanese) && blank(r.romaji) && blank(r.singAlong)))
    .map((r, position) => {
      const japanese = r.japanese.trim();
      const suppliedRomaji = r.romaji.trim();
      const generated = japanese ? romanizer.romanizeLine(japanese) : "";
      const romaji = suppliedRomaji || generated;
      const suppliedSingAlong = r.singAlong.trim();
      return {
        position,
        timestampMs: r.timestampMs,
        japanese,
        romaji,
        singAlong: suppliedSingAlong || convertSingAlong(romaji),
        issues: LyricsPairing.issuesFor(japanese, suppliedRomaji, generated),
      };
    });
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** Manual input: preserve internal blank rows, matching Android's split-line pairing semantics. */
export function assembleManual(assembler: LyricsAssembler, input: LyricsInput): SongDraft {
  return assembler.assemble({
    ...input,
    japanese: input.japanese ?? "",
    romaji: input.romaji ?? "",
    source: "manual",
  });
}

/** Normalised single-language file import (TXT / LRC / DOCX paragraphs). */
export function assembleSingleKind(
  assembler: LyricsAssembler,
  content: string,
  kind: SingleKind,
  meta: { title: string; artist: string; source: string },
): SongDraft {
  if (hasLrcTimestamps(content)) {
    if (kind === "original") return assembler.assembleLrc({ ...meta, japanese: content });
    const lines: StructuredLyricLineInput[] = LrcParser.parse(content).map((p) => ({
      timestampMs: p.timestampMs,
      romaji: p.text,
    }));
    return {
      ...assembler.assembleStructured({ ...meta, lines }),
      source: meta.source,
    };
  }
  const text = nonBlankLines(content).join("\n");
  return assembler.assemble(
    kind === "original" ? { ...meta, japanese: text } : { ...meta, romaji: text },
  );
}
