import { describe, expect, it } from "vitest";
import { KanaRomanizer } from "../kana-romanizer";

const r = KanaRomanizer.romanize;

describe("KanaRomanizer", () => {
  it("maps hiragana", () => expect(r("あさのひかり")).toBe("asanohikari"));
  it("maps katakana via hiragana shift", () => expect(r("カタカナ")).toBe("katakana"));
  it("doubles consonant after っ", () => expect(r("きって")).toBe("kitte"));
  it("doubles first consonant of digraph after っ", () => expect(r("まっちゃ")).toBe("maccha"));
  it("drops っ before a vowel", () => expect(r("っあ")).toBe("a"));
  it("ー repeats previous vowel", () => expect(r("ラーメン")).toBe("raamen"));
  it("ー with no previous vowel adds nothing", () => expect(r("ー")).toBe(""));
  it("handles yōon digraphs", () => expect(r("きょう")).toBe("kyou"));
  it("handles foreign sounds", () => {
    expect(r("ティ")).toBe("ti");
    expect(r("ファン")).toBe("fan");
  });
  it("を -> o, ん -> n", () => expect(r("をん")).toBe("on"));
  it("keeps unknown characters", () => expect(r("空A")).toBe("空A"));
});
