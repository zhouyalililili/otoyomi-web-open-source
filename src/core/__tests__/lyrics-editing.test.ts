import { describe, expect, it } from "vitest";
import { LyricIssue } from "@/types";
import { JapaneseRomanizer } from "../japanese-romanizer";
import { LyricsAssembler } from "../lyrics-assembler";
import {
  assembleManual,
  assembleSingleKind,
  finalizeEditedLines,
  moveItem,
} from "../lyrics-editing";

const romanizer = new JapaneseRomanizer();
const assembler = new LyricsAssembler(romanizer);
const meta = { title: "t", artist: "a", source: "file" };

describe("finalizeEditedLines", () => {
  it("drops rows where all three layers are blank and reindexes", () => {
    const lines = finalizeEditedLines(
      [
        { timestampMs: null, japanese: " ", romaji: "", singAlong: "" },
        { timestampMs: 5, japanese: "あさ", romaji: "asa", singAlong: "啊撒" },
        { timestampMs: null, japanese: "", romaji: "", singAlong: "只有音译" },
      ],
      romanizer,
    );
    expect(lines.map((l) => [l.position, l.timestampMs, l.singAlong])).toEqual([
      [0, 5, "啊撒"],
      [1, null, "只有音译"],
    ]);
    expect(lines[1]?.issues).toEqual([LyricIssue.NEEDS_CONFIRMATION]);
  });

  it("fills missing romaji and sing-along when only Japanese is supplied", () => {
    const lines = finalizeEditedLines(
      [{ timestampMs: null, japanese: "あさ", romaji: "", singAlong: "" }],
      romanizer,
      (value) => `guide:${value}`,
    );
    expect(lines[0]).toMatchObject({
      japanese: "あさ",
      romaji: "asa",
      singAlong: "guide:asa",
      issues: [LyricIssue.ORIGINAL_ONLY],
    });
  });

  it("keeps user-supplied romaji and sing-along", () => {
    const lines = finalizeEditedLines(
      [
        {
          timestampMs: null,
          japanese: "あさ",
          romaji: "custom",
          singAlong: "自定义",
        },
      ],
      romanizer,
      () => "generated",
    );
    expect(lines[0]).toMatchObject({ romaji: "custom", singAlong: "自定义" });
  });
});

describe("moveItem", () => {
  it("moves and ignores out-of-range", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});

describe("assembleManual", () => {
  it("pairs non-blank lines and keeps the longer side", () => {
    const d = assembleManual(assembler, {
      title: "",
      artist: "",
      japanese: "あさ\n\nきみ\nつき",
      romaji: "asa\n\nkimi",
    });
    expect(d.lines.map((l) => [l.japanese, l.romaji])).toEqual([
      ["あさ", "asa"],
      ["きみ", "kimi"],
      ["つき", "tsuki"],
    ]);
    expect(d.lines[2]?.issues).toEqual([LyricIssue.ORIGINAL_ONLY]);
  });
  it("preserves internal blank rows so the two columns do not shift", () => {
    const d = assembleManual(assembler, {
      title: "",
      artist: "",
      japanese: "あさ\n\nきみ",
      romaji: "asa\nkimi",
    });
    expect(d.lines.map((l) => [l.japanese, l.romaji])).toEqual([
      ["あさ", "asa"],
      ["", "kimi"],
      ["きみ", "kimi"],
    ]);
  });

  it("accepts romaji only", () => {
    const d = assembleManual(assembler, {
      title: "",
      artist: "",
      romaji: "asa",
    });
    expect(d.lines[0]?.issues).toEqual([LyricIssue.ROMAJI_ONLY]);
  });
});

describe("assembleSingleKind", () => {
  it("TXT original uses non-blank lines", () => {
    expect(
      assembleSingleKind(assembler, "あさ\n\nきみ", "original", meta).lines.map((l) => l.japanese),
    ).toEqual(["あさ", "きみ"]);
  });
  it("LRC original keeps ms timestamps", () => {
    const d = assembleSingleKind(assembler, "[00:01.23]あさ", "original", meta);
    expect(d.lines[0]).toMatchObject({ timestampMs: 1230, japanese: "あさ" });
  });
  it("LRC romaji keeps timestamps in romaji layer", () => {
    const d = assembleSingleKind(assembler, "[00:02.5]asa", "romaji", meta);
    expect(d.lines[0]).toMatchObject({
      timestampMs: 2500,
      japanese: "",
      romaji: "asa",
    });
    expect(d.source).toBe("file");
  });
});
