// Pure timing model for the line-by-line practice view.
import type { LyricLine } from "@/types";

export const PRACTICE_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PracticeSpeed = (typeof PRACTICE_SPEEDS)[number];

/** Snap any number to the nearest supported speed. */
export function snapSpeed(value: number): PracticeSpeed {
  if (!Number.isFinite(value)) return 1;
  return PRACTICE_SPEEDS.reduce(
    (best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best),
    1 as PracticeSpeed,
  );
}

const MIN_LINE_MS = 2000;
const MAX_LINE_MS = 9000;

/** Estimated singing time for a line without timestamps, at 1.0x. */
export function estimateLineDurationMs(line: Pick<LyricLine, "japanese" | "romaji">): number {
  const units = line.romaji.trim()
    ? (line.romaji.match(/[aeiou]/gi) ?? []).length
    : line.japanese.replace(/\s/g, "").length;
  return Math.min(MAX_LINE_MS, Math.max(MIN_LINE_MS, 1500 + units * 220));
}

export interface PracticeTimeline {
  /** Start time (ms, at 1.0x) for each line; monotonic non-decreasing. */
  starts: number[];
  /** Time at which the last line ends. */
  totalMs: number;
  /** True when every line carries an LRC timestamp. */
  synced: boolean;
}

/**
 * Build a timeline. Timestamped lines keep their LRC time; lines without one start
 * after the previous line's estimated duration. Starts never go backwards.
 */
export function buildTimeline(
  lines: Pick<LyricLine, "japanese" | "romaji" | "timestampMs">[],
): PracticeTimeline {
  const starts: number[] = [];
  lines.forEach((line, i) => {
    const prev = i > 0 ? lines[i - 1]! : null;
    const fallback = prev ? starts[i - 1]! + estimateLineDurationMs(prev) : 0;
    const start = line.timestampMs ?? fallback;
    starts.push(i > 0 ? Math.max(starts[i - 1]!, start) : start);
  });
  const last = lines[lines.length - 1];
  const totalMs = last ? starts[starts.length - 1]! + estimateLineDurationMs(last) : 0;
  return {
    starts,
    totalMs,
    synced: lines.length > 0 && lines.every((l) => l.timestampMs !== null),
  };
}

/** Index of the line active at `elapsedMs` (last start <= elapsed); 0 before the first line, -1 when empty. */
export function activeLineIndex(starts: number[], elapsedMs: number): number {
  if (!starts.length) return -1;
  let lo = 0;
  let hi = starts.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid]! <= elapsedMs) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Advance playback clock by real elapsed time scaled by speed. */
export const advanceClock = (elapsedMs: number, realDeltaMs: number, speed: number) =>
  elapsedMs + Math.max(0, realDeltaMs) * speed;
