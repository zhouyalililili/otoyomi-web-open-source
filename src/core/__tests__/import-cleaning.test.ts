import { describe, expect, it } from "vitest";
import { analyzeSmartImport, cleanLyricsText, detectMixed } from "../import-cleaning";

describe("cleanLyricsText", () => {
  it("drops blanks, credits, separators and zero-width chars", () => {
    expect(cleanLyricsText("\uFEFF作词：某人\n\n あさ\u200B \n♪♪\n[ar:x]\nasa")).toEqual({
      lines: ["あさ", "asa"],
      removed: ["作词：某人", "♪♪", "[ar:x]"],
    });
  });
});

describe("detectMixed", () => {
  it("romaji mode rejects any Japanese line", () => {
    expect(detectMixed(["asa", "あさ"], "romaji")).toBe(true);
    expect(detectMixed(["asa", "kimi"], "romaji")).toBe(false);
  });
  it("original mode tolerates a single English line", () => {
    expect(detectMixed(["あさ", "きみ", "oh yeah", "つき", "ひ"], "original")).toBe(false);
    expect(detectMixed(["あさ", "asa", "きみ", "kimi"], "original")).toBe(true);
  });
});

describe("analyzeSmartImport", () => {
  it("detects empty", () => expect(analyzeSmartImport("\n作曲: x\n").layout).toBe("empty"));
  it("detects original-only", () => {
    const a = analyzeSmartImport("あさ\nきみ");
    expect(a.layout).toBe("original-only");
    expect(a.structured?.lines).toEqual([{ japanese: "あさ" }, { japanese: "きみ" }]);
  });
  it("detects romaji-only", () =>
    expect(analyzeSmartImport("asa\nkimi").layout).toBe("romaji-only"));
  it("detects alternating", () => {
    const a = analyzeSmartImport("あさ\nasa\nきみ\nkimi");
    expect(a.layout).toBe("alternating");
    expect(a.structured?.lines).toEqual([
      { japanese: "あさ", romaji: "asa" },
      { japanese: "きみ", romaji: "kimi" },
    ]);
  });
  it("detects split blocks", () => {
    const a = analyzeSmartImport("あさ\nきみ\n\nasa\nkimi");
    expect(a.layout).toBe("split-blocks");
    expect(a.structured?.lines).toEqual([
      { japanese: "あさ", romaji: "asa" },
      { japanese: "きみ", romaji: "kimi" },
    ]);
  });
  it("pairs LRC lines sharing a timestamp", () => {
    const a = analyzeSmartImport("[00:01.00]あさ\n[00:01.00]asa\n[00:02.00]きみ\n[00:02.00]kimi");
    expect(a.layout).toBe("lrc-paired");
    expect(a.structured?.lines).toEqual([
      { timestampMs: 1000, japanese: "あさ", romaji: "asa" },
      { timestampMs: 2000, japanese: "きみ", romaji: "kimi" },
    ]);
  });
  it("falls back to AI for irregular content", () => {
    const a = analyzeSmartImport("asa\nあさ\nきみ\nhoshi\nkimi\nつき");
    expect(a.layout).toBe("needs-ai");
    expect(a.structured).toBeNull();
  });
});
