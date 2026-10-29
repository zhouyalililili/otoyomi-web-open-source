import { describe, expect, it } from "vitest";
import { LyricIssue } from "@/types";
import { JapaneseRomanizer, type JapaneseTokenizer } from "../japanese-romanizer";
import { LyricsAssembler } from "../lyrics-assembler";

const romanizer = new JapaneseRomanizer();
const a = new LyricsAssembler(romanizer);

describe("JapaneseRomanizer", () => {
  it("uses readings and attaches punctuation", () => {
    const tok: JapaneseTokenizer = {
      tokenize: () => [
        { surface: "月", reading: "ツキ" },
        { surface: "が", reading: "*" },
        { surface: "。" },
      ],
    };
    expect(new JapaneseRomanizer(tok).romanizeLine("月が。")).toBe("tsuki ga。");
  });
  it("blank lines romanize to empty", () => expect(romanizer.romanize("あ\n \nい")).toBe("a\n\ni"));
});

describe("LyricsAssembler", () => {
  it("reviseLine generates romaji and sing-along", () => {
    expect(a.reviseLine(0, 10, " つき が きれい ", "", "")).toEqual({
      position: 0,
      timestampMs: 10,
      japanese: "つき が きれい",
      romaji: "tsuki ga kirei",
      singAlong: "粗ki 嘎 ki类衣",
      issues: [LyricIssue.ORIGINAL_ONLY],
    });
  });
  it("rejects CJK text masquerading as romaji", () => {
    const l = a.reviseLine(0, null, "夢", "梦想翻译", "");
    expect(l.romaji).toBe("");
    expect(l.singAlong).toBe("");
  });
  it("reviseLine keeps supplied romaji and sing-along", () => {
    const l = a.reviseLine(1, null, "あさ", "asa", "自定义");
    expect(l.romaji).toBe("asa");
    expect(l.singAlong).toBe("自定义");
    expect(l.issues).toEqual([]);
  });
  it("applies pronunciation rules", () => {
    const b = new LyricsAssembler(romanizer, () => ({ ki: "奇" }));
    expect(b.reviseLine(0, null, "", "ki", "").singAlong).toBe("奇");
  });
  it("emptyLine needs confirmation", () => {
    expect(a.emptyLine(3)).toEqual({
      position: 3,
      timestampMs: null,
      japanese: "",
      romaji: "",
      singAlong: "",
      issues: [LyricIssue.NEEDS_CONFIRMATION],
    });
  });
  it("assemble pairs lines and defaults title", () => {
    const d = a.assemble({
      title: " ",
      artist: " ひより ",
      japanese: "あさ\nきみ",
      romaji: "asa\nkimi",
    });
    expect(d.title).toBe("未命名歌曲");
    expect(d.artist).toBe("ひより");
    expect(d.source).toBe("manual");
    expect(d.lines.map((l) => [l.position, l.japanese, l.romaji])).toEqual([
      [0, "あさ", "asa"],
      [1, "きみ", "kimi"],
    ]);
  });
  it("assembleAlternating uses interleaved content", () => {
    const d = a.assembleAlternating({
      title: "t",
      artist: "",
      japanese: "あさ\nasa\nlone",
    });
    expect(d.lines.map((l) => [l.japanese, l.romaji, l.issues])).toEqual([
      ["あさ", "asa", []],
      ["", "lone", [LyricIssue.ROMAJI_ONLY]],
    ]);
  });
  it("assembleLrc keeps timestamps and fills romaji", () => {
    const d = a.assembleLrc({
      title: "t",
      artist: "",
      japanese: "[00:02]きみ\n[00:01]あさ",
      romaji: "ASA\n",
    });
    expect(d.lines.map((l) => [l.timestampMs, l.japanese, l.romaji, l.issues])).toEqual([
      [1000, "あさ", "ASA", []],
      [2000, "きみ", "kimi", []],
    ]);
  });
  it("assembleLrc falls back to assemble when nothing parses", () => {
    expect(
      a.assembleLrc({ title: "t", artist: "", japanese: "", romaji: "asa" }).lines[0]?.romaji,
    ).toBe("asa");
  });
  it("assembleStructured drops empty lines and reindexes", () => {
    const d = a.assembleStructured({
      lines: [{ japanese: " " }, { japanese: "あ", timestampMs: 5 }],
    });
    expect(d.source).toBe("smart");
    expect(d.title).toBe("未命名歌曲");
    expect(d.lines).toHaveLength(1);
    expect(d.lines[0]).toMatchObject({
      position: 0,
      timestampMs: 5,
      romaji: "a",
      singAlong: "啊",
    });
  });
});
