// Port of LyricsAssembler.kt
import {
  LyricIssue,
  type LyricLine,
  type LyricsInput,
  type SongDraft,
  type StructuredLyricsInput,
} from "@/types";
import type { JapaneseRomanizer } from "./japanese-romanizer";
import { LrcParser } from "./lrc-parser";
import { LyricsPairing, type LinePair } from "./lyrics-pairing";
import { SingAlongConverter } from "./sing-along-converter";
import { nonBlankLines } from "./text";

const UNTITLED = "未命名歌曲";
const orUntitled = (t: string) => t.trim() || UNTITLED;
const isSafeRomaji = (value: string) =>
  value.trim() !== "" && /^[A-Za-z0-9\x20\x27.,!?-]+$/.test(value.trim());

export class LyricsAssembler {
  constructor(
    private readonly romanizer: Pick<JapaneseRomanizer, "romanizeLine">,
    private readonly pronunciationRules: () => Record<string, string> = () => ({}),
  ) {}

  reviseLine(
    position: number,
    timestampMs: number | null,
    japanese: string,
    suppliedRomaji: string,
    suppliedSingAlong: string,
  ): LyricLine {
    const nj = japanese.trim();
    const supplied = suppliedRomaji.trim();
    const generatedRaw = nj ? this.romanizer.romanizeLine(nj) : "";
    const generated = isSafeRomaji(generatedRaw) ? generatedRaw : "";
    const nr = isSafeRomaji(supplied) ? supplied : "";
    const romaji = nr || generated;
    return {
      position,
      timestampMs,
      japanese: nj,
      romaji,
      singAlong:
        suppliedSingAlong.trim() === ""
          ? SingAlongConverter.convert(romaji, this.pronunciationRules())
          : suppliedSingAlong,
      issues: LyricsPairing.issuesFor(nj, nr, generated),
    };
  }

  emptyLine(position: number): LyricLine {
    return {
      position,
      timestampMs: null,
      japanese: "",
      romaji: "",
      singAlong: "",
      issues: [LyricIssue.NEEDS_CONFIRMATION],
    };
  }

  private draft(input: LyricsInput, lines: LyricLine[]): SongDraft {
    return {
      title: orUntitled(input.title),
      artist: input.artist.trim(),
      album: (input.album ?? "").trim(),
      source: input.source ?? "manual",
      sourceId: input.sourceId ?? null,
      lines,
    };
  }

  assemble(input: LyricsInput): SongDraft {
    return this.draft(
      input,
      this.assemblePairs(LyricsPairing.splitLines(input.japanese ?? "", input.romaji ?? "")),
    );
  }

  assembleAlternating(input: LyricsInput): SongDraft {
    return this.draft(
      input,
      this.assemblePairs(LyricsPairing.alternatingLines(input.japanese ?? "")),
    );
  }

  assembleLrc(input: LyricsInput): SongDraft {
    const parsed = LrcParser.parse(input.japanese ?? "");
    if (!parsed.length) return this.assemble(input);
    const supplied = nonBlankLines(input.romaji ?? "");
    const lines = parsed.map((p, index): LyricLine => {
      const s = supplied[index]?.trim() ?? "";
      const generated = this.romanizer.romanizeLine(p.text);
      const romaji = isSafeRomaji(s) ? s : isSafeRomaji(generated) ? generated : "";
      return {
        position: index,
        timestampMs: p.timestampMs,
        japanese: p.text,
        romaji,
        singAlong: SingAlongConverter.convert(romaji, this.pronunciationRules()),
        issues: [],
      };
    });
    return this.draft(input, lines);
  }

  assembleStructured(input: StructuredLyricsInput): SongDraft {
    const lines = (input.lines ?? [])
      .map((s, i) =>
        this.reviseLine(i, s.timestampMs ?? null, s.japanese ?? "", s.romaji ?? "", ""),
      )
      .filter((l) => l.japanese.trim() || l.romaji.trim() || l.singAlong.trim())
      .map((l, i) => ({ ...l, position: i }));
    return {
      title: orUntitled(input.title ?? ""),
      artist: (input.artist ?? "").trim(),
      album: (input.album ?? "").trim(),
      source: input.source ?? "smart",
      sourceId: null,
      lines,
    };
  }

  private assemblePairs(pairs: LinePair[]): LyricLine[] {
    return pairs.map(([o, r], i) => this.reviseLine(i, null, o, r, ""));
  }
}
