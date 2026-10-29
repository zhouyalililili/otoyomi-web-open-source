import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../app-settings";
import { buildBackup, parseBackup } from "../backup";
import { mergeDictionary, rulesFromOverrides, validateRule } from "../pronunciation-dictionary";
import { SingAlongConverter } from "../sing-along-converter";
import { LyricsAssembler } from "../lyrics-assembler";
import { JapaneseRomanizer } from "../japanese-romanizer";

describe("normalizeSettings", () => {
  it("defaults show all three layers at 1.0x", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      showJapanese: true,
      showRomaji: true,
      showSingAlong: true,
      defaultSpeed: 1,
    });
  });
  it("clamps and snaps invalid values", () => {
    expect(
      normalizeSettings({
        fontScale: 5,
        defaultSpeed: 0.8,
        overlayOpacity: 2,
        defaultBackground: "x",
        showRomaji: false,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      fontScale: 1.6,
      defaultSpeed: 0.75,
      overlayOpacity: 0.9,
      showRomaji: false,
    });
  });
});

describe("pronunciation dictionary", () => {
  it("validates and normalises keys", () => {
    expect(validateRule(" KĀ ", " 卡～ ")).toEqual({
      ok: true,
      rule: { romaji: "kaa", singAlong: "卡～" },
    });
    expect(validateRule("k a", "x").ok).toBe(false);
    expect(validateRule("ka", " ").ok).toBe(false);
  });
  it("personal rules override system rules in the converter", () => {
    const rules = rulesFromOverrides([{ romaji: "tsu", singAlong: "茨" }]);
    expect(SingAlongConverter.convert("tsuki", rules)).toBe("茨ki");
  });
  it("assembler picks up rule changes live", () => {
    let rules: Record<string, string> = {};
    const a = new LyricsAssembler(new JapaneseRomanizer(), () => rules);
    expect(a.reviseLine(0, null, "", "ki", "").singAlong).toBe("ki");
    rules = { ki: "奇" };
    expect(a.reviseLine(0, null, "", "ki", "").singAlong).toBe("奇");
  });
  it("merges system and custom entries", () => {
    const m = mergeDictionary([
      { romaji: "ki", singAlong: "奇" },
      { romaji: "xyz", singAlong: "叉" },
    ]);
    expect(m.find((e) => e.romaji === "ki")).toEqual({
      romaji: "ki",
      systemValue: "ki",
      customValue: "奇",
    });
    expect(m.find((e) => e.romaji === "xyz")).toEqual({
      romaji: "xyz",
      systemValue: null,
      customValue: "叉",
    });
    expect(m.find((e) => e.romaji === "ka")?.customValue).toBeNull();
  });
});

describe("backup", () => {
  const song = {
    id: "s1",
    title: "t",
    artist: "",
    album: "",
    source: "manual",
    sourceId: null,
    lines: [],
    updatedAt: 1,
    lastPracticedAt: null,
    backgroundAssetId: "a1",
  };
  it("round-trips", () => {
    const b = buildBackup(
      {
        songs: [song],
        collections: [{ id: "c", name: "n", songIds: ["s1"], updatedAt: 1 }],
        pronunciation: [{ romaji: "ki", singAlong: "奇" }],
        settings: { fontScale: 1.2 },
        assets: [{ id: "a1", dataUrl: "data:image/png;base64,AA", createdAt: 1 }],
      },
      99,
    );
    const r = parseBackup(JSON.stringify(b));
    expect(r).toEqual({ ok: true, backup: b });
  });
  it("rejects foreign, newer or corrupt files", () => {
    expect(parseBackup("nope").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "x", version: 1 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "otoyomi", version: 99 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "otoyomi", version: 1, songs: [{ id: 1 }] })).ok).toBe(
      false,
    );
  });
});
