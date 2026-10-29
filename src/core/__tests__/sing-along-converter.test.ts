import { describe, expect, it } from "vitest";
import { SingAlongConverter } from "../sing-along-converter";

const c = SingAlongConverter.convert;

describe("SingAlongConverter", () => {
  it("has 80+ default rules sorted", () => {
    const keys = Object.keys(SingAlongConverter.defaultRules());
    expect(keys.length).toBeGreaterThan(80);
    expect(keys).toEqual([...keys].sort());
  });
  it("tsu -> 粗, ki stays ki", () => expect(c("tsuki ga kirei")).toBe("粗ki 嘎 ki类衣"));
  it("to / ta are not split", () => {
    expect(c("to")).toBe("托");
    expect(c("ta")).toBe("他");
  });
  it("longest syllable wins", () => {
    expect(c("shi")).toBe("西");
    expect(c("kyo")).toBe("ki哟");
    expect(c("shin")).toBe("西嗯");
  });
  it("skips geminated consonant", () => expect(c("kitte")).toBe("ki忒"));
  it("keeps leading acronym", () => expect(c("LOVEyou")).toBe("LOVE哟乌"));
  it("never echoes CJK text from the romaji field", () => {
    expect(c("夢naraba")).toBe("");
    expect(c("繁體翻譯")).toBe("");
  });
  it("returns unconvertible word unchanged", () => {
    expect(c("LOVE")).toBe("LOVE");
    expect(c("xyz")).toBe("xyz");
  });
  it("normalizes macrons", () => {
    expect(c("tōkyō")).toBe("托乌ki哟乌");
    expect(c("ā")).toBe("啊啊");
  });
  it("preserves punctuation and spaces", () => expect(c("a, i!")).toBe("啊, 衣!"));
  it("is case-insensitive for syllables", () => expect(c("Ka")).toBe("卡"));
  it("personal overrides win", () => expect(c("ki", { ki: "奇" })).toBe("奇"));
  it("personal keys are normalized", () => expect(c("kaa", { "KĀ ": "卡～" })).toBe("卡～"));
  it("invalid personal rules are ignored", () =>
    expect(c("ki", { "k i": "x", ki: "  " })).toBe("ki"));
});
