import { describe, expect, it } from "vitest";
import { LyricIssue } from "@/types";
import { classify, LineKind, LyricsPairing, normalize, similarity } from "../lyrics-pairing";

describe("LyricsPairing", () => {
  it("splitLines trims outer blanks and drops fully blank pairs", () => {
    expect(LyricsPairing.splitLines("\n a \n\n b\n", "x\n\ny")).toEqual([
      ["a", "x"],
      ["b", "y"],
    ]);
  });
  it("splitLines preserves internal blanks on one side", () => {
    expect(LyricsPairing.splitLines("a\n\nb", "x\ny\nz")).toEqual([
      ["a", "x"],
      ["", "y"],
      ["b", "z"],
    ]);
  });
  it("splitLines pads shorter side", () => {
    expect(LyricsPairing.splitLines("a\nb", "x")).toEqual([
      ["a", "x"],
      ["b", ""],
    ]);
  });
  it("classifies lines", () => {
    expect(classify("月")).toBe(LineKind.ORIGINAL);
    expect(classify("tsuki")).toBe(LineKind.ROMAJI);
    expect(classify("123 ♪")).toBe(LineKind.UNKNOWN);
  });
  it("alternatingLines pairs original with following romaji", () => {
    expect(LyricsPairing.alternatingLines("あさ\nasa\n\nきみ\nひ\nhi\nlone\n123\nつき")).toEqual([
      ["あさ", "asa"],
      ["きみ", ""],
      ["ひ", "hi"],
      ["", "lone"],
      ["123", ""],
      ["つき", ""],
    ]);
  });
  it("normalize unifies spelling", () => expect(normalize("Shi-chī tsu fu")).toBe("sitiituhu"));
  it("similarity (levenshtein)", () => {
    expect(similarity("kitten", "sitting")).toBeCloseTo(1 - 3 / 7);
    expect(similarity("", "a")).toBe(0);
    expect(similarity("abc", "abc")).toBe(1);
  });
  it("issuesFor diagnoses", () => {
    expect(LyricsPairing.issuesFor("", "", "")).toEqual([LyricIssue.NEEDS_CONFIRMATION]);
    expect(LyricsPairing.issuesFor("", "asa", "")).toEqual([LyricIssue.ROMAJI_ONLY]);
    expect(LyricsPairing.issuesFor("あさ", "", "asa")).toEqual([LyricIssue.ORIGINAL_ONLY]);
    expect(LyricsPairing.issuesFor("あさ", "asa", "")).toEqual([LyricIssue.NEEDS_CONFIRMATION]);
    expect(LyricsPairing.issuesFor("あさ", "asa", "asa")).toEqual([]);
    expect(LyricsPairing.issuesFor("し", "si", "shi")).toEqual([]);
    expect(LyricsPairing.issuesFor("あさ", "zzzzzz", "asa")).toEqual([
      LyricIssue.POSSIBLE_MISMATCH,
    ]);
  });
});
