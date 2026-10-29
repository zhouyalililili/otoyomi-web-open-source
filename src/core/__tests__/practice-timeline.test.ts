import { describe, expect, it } from "vitest";
import {
  activeLineIndex,
  advanceClock,
  buildTimeline,
  estimateLineDurationMs,
  PRACTICE_SPEEDS,
  snapSpeed,
} from "../practice-timeline";

const L = (japanese: string, romaji: string, timestampMs: number | null = null) => ({
  japanese,
  romaji,
  timestampMs,
});

describe("practice timeline", () => {
  it("offers exactly the six speeds", () =>
    expect([...PRACTICE_SPEEDS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]));
  it("snaps speeds", () => {
    expect(snapSpeed(0.8)).toBe(0.75);
    expect(snapSpeed(3)).toBe(2);
    expect(snapSpeed(Number.NaN)).toBe(1);
  });
  it("estimates duration from romaji vowels, clamped", () => {
    expect(estimateLineDurationMs(L("", "asa no hikari"))).toBe(1500 + 6 * 220);
    expect(estimateLineDurationMs(L("", ""))).toBe(2000);
    expect(estimateLineDurationMs(L("", "a".repeat(100)))).toBe(9000);
    expect(estimateLineDurationMs(L("あさ の", ""))).toBe(1500 + 3 * 220);
  });
  it("uses LRC timestamps when present", () => {
    const t = buildTimeline([L("あ", "a", 1000), L("い", "i", 3500)]);
    expect(t.starts).toEqual([1000, 3500]);
    expect(t.synced).toBe(true);
  });
  it("builds a virtual timeline without timestamps", () => {
    const t = buildTimeline([L("", "a"), L("", "a")]);
    expect(t.starts).toEqual([0, 2000]);
    expect(t.totalMs).toBe(4000);
    expect(t.synced).toBe(false);
  });
  it("fills gaps and never goes backwards", () => {
    const t = buildTimeline([L("", "a", 5000), L("", "a"), L("", "a", 1000)]);
    expect(t.starts).toEqual([5000, 7000, 7000]);
  });
  it("finds the active line", () => {
    const s = [1000, 3000, 6000];
    expect(activeLineIndex(s, 0)).toBe(0);
    expect(activeLineIndex(s, 3000)).toBe(1);
    expect(activeLineIndex(s, 99999)).toBe(2);
    expect(activeLineIndex([], 5)).toBe(-1);
  });
  it("advances the clock by speed", () => {
    expect(advanceClock(1000, 100, 1.5)).toBe(1150);
    expect(advanceClock(1000, -50, 2)).toBe(1000);
  });
});
