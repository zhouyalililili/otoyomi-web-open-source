import { describe, expect, it } from "vitest";
import { LrcParser } from "../lrc-parser";

describe("LrcParser", () => {
  it("filters metadata, converts ms precision and sorts ascending", () => {
    const lrc =
      "\uFEFF[ar:Artist]\n[ti:Title]\n[00:12.34]あ\n[00:01.5]い\n[00:05]\n[01:02.123][00:03.000]う";
    expect(LrcParser.parse(lrc)).toEqual([
      { timestampMs: 1500, text: "い" },
      { timestampMs: 3000, text: "う" },
      { timestampMs: 12340, text: "あ" },
      { timestampMs: 62123, text: "う" },
    ]);
  });
  it("supports colon separator and minute up to 3 digits", () => {
    expect(LrcParser.parse("[100:00:5]x")).toEqual([{ timestampMs: 6000500, text: "x" }]);
  });
  it("keeps untimed lines in order when nothing is timed", () => {
    expect(LrcParser.parse("b\na")).toEqual([
      { timestampMs: null, text: "b" },
      { timestampMs: null, text: "a" },
    ]);
  });
  it("puts untimed lines after timed ones", () => {
    expect(LrcParser.parse("plain\n[00:01]t").map((l) => l.text)).toEqual(["t", "plain"]);
  });
});
