import { describe, expect, it } from "vitest";
import { LyricIssue } from "@/types";
import { JapaneseRomanizer, type JapaneseTokenizer } from "../japanese-romanizer";
import { LyricsAssembler } from "../lyrics-assembler";
import {
  containsJapanese,
  findIncompleteReadingLines,
  markIncompleteReadingIssues,
} from "../reading-validation";

// Mirrors real Kuromoji/IPADIC output: 昏 is unknown (no reading), other words are regular IPADIC entries.
const ipadic: Record<string, [string, string | null][]> = {
  昏い: [
    ["昏", null],
    ["い", "イ"],
  ],
  言えずに隠してた昏い過去も: [
    ["言え", "イエ"],
    ["ず", "ズ"],
    ["に", "ニ"],
    ["隠し", "カクシ"],
    ["て", "テ"],
    ["た", "タ"],
    ["昏", null],
    ["い", "イ"],
    ["過去", "カコ"],
    ["も", "モ"],
  ],
  あなたがいなきゃ永遠に: [
    ["あなた", "アナタ"],
    ["が", "ガ"],
    ["い", "イ"],
    ["なきゃ", "ナキャ"],
    ["永遠", "エイエン"],
    ["に", "ニ"],
  ],
  まま: [["まま", "ママ"]],
  言えずに隠してた: [
    ["言え", "イエ"],
    ["ず", "ズ"],
    ["に", "ニ"],
    ["隠し", "カクシ"],
    ["て", "テ"],
    ["た", "タ"],
  ],
  過去も: [
    ["過去", "カコ"],
    ["も", "モ"],
  ],
  夢にみる: [
    ["夢", "ユメ"],
    ["に", "ニ"],
    ["みる", "ミル"],
  ],
  未知の霙: [
    ["未知", "ミチ"],
    ["の", "ノ"],
    ["霙", null],
  ],
};
const tokenizer: JapaneseTokenizer = {
  tokenize: (line) => (ipadic[line] ?? []).map(([surface, reading]) => ({ surface, reading })),
};
const romanizer = new JapaneseRomanizer(tokenizer);
const assembler = new LyricsAssembler(romanizer);

describe("supplementary readings", () => {
  it("昏い generates kurai", () => {
    expect(romanizer.romanizeLine("昏い")).toBe("kurai");
  });

  it("a full sentence containing 昏い becomes pure romaji", () => {
    const r = romanizer.romanizeLine("言えずに隠してた昏い過去も");
    expect(r).toBe("ie zu ni kakushi te ta kurai kako mo");
    expect(containsJapanese(r)).toBe(false);
  });

  it("applies even when the tokenizer would split across the word boundary", () => {
    expect(romanizer.romanizeLine("あなたがいなきゃ永遠に昏いまま")).toBe(
      "anata ga i nakya eien ni kurai mama",
    );
  });

  it("never echoes an unknown kanji surface as romaji", () => {
    expect(romanizer.romanizeLine("未知の霙")).toBe("");
  });
});

describe("reading completeness", () => {
  it("fails when romaji contains Japanese characters", () => {
    const lines = [
      {
        position: 0,
        timestampMs: null,
        japanese: "夢",
        romaji: "夢 yume",
        singAlong: "优美",
        issues: [],
      },
    ];
    expect(findIncompleteReadingLines({ lines })).toEqual([1]);
  });

  it("marks an incomplete line for review without rejecting the draft", () => {
    const draft = assembler.assemble({ title: "t", artist: "a", japanese: "夢にみる\n未知の霙" });
    const diagnosed = markIncompleteReadingIssues(draft);
    expect(diagnosed.lines).toHaveLength(2);
    expect(diagnosed.lines[0]?.romaji).toBe("yume ni miru");
    expect(diagnosed.lines[1]?.romaji).toBe("");
    expect(diagnosed.lines[1]?.issues).toEqual([LyricIssue.NEEDS_CONFIRMATION]);
  });

  it("search-style data mixing IPADIC and supplementary words succeeds with clean sing-along", () => {
    const draft = assembler.assembleLrc({
      title: "t",
      artist: "a",
      japanese: "[00:01.00]夢にみる\n[00:05.00]言えずに隠してた昏い過去も",
    });
    expect(markIncompleteReadingIssues(draft)).toBe(draft);
    expect(draft.lines.map((l) => l.romaji)).toEqual([
      "yume ni miru",
      "ie zu ni kakushi te ta kurai kako mo",
    ]);
    for (const l of draft.lines) {
      expect(l.singAlong.trim()).not.toBe("");
      expect(/[\u3040-\u30ff]/u.test(l.singAlong)).toBe(false);
      expect(/[夢昏隠過言]/u.test(l.singAlong)).toBe(false);
    }
  });
});
