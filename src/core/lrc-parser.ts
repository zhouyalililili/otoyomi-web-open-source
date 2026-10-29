// Port of LrcParser.kt
import { kotlinLines } from "./text";

export interface ParsedLyricLine {
  timestampMs: number | null;
  text: string;
}

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?]/g;
const METADATA = /^\[(ar|ti|al|by|offset|re|ve|length):.*]$/i;

export const LrcParser = {
  parse(content: string): ParsedLyricLine[] {
    const parsed: ParsedLyricLine[] = [];
    for (const raw of kotlinLines(content)) {
      let line = raw.trim();
      if (line.startsWith("\uFEFF")) line = line.slice(1);
      if (line.trim() === "" || METADATA.test(line)) continue;
      const matches = [...line.matchAll(TIMESTAMP)];
      const text = line.replace(TIMESTAMP, "").trim();
      if (text === "") continue;
      if (!matches.length) {
        parsed.push({ timestampMs: null, text });
        continue;
      }
      for (const m of matches) {
        const minute = Number(m[1]);
        const second = Number(m[2]);
        const f = m[3] ?? "";
        const fractionMs =
          f.length === 0
            ? 0
            : f.length === 1
              ? Number(f) * 100
              : f.length === 2
                ? Number(f) * 10
                : Number(f.slice(0, 3).padEnd(3, "0"));
        parsed.push({ timestampMs: (minute * 60 + second) * 1000 + fractionMs, text });
      }
    }
    if (parsed.some((p) => p.timestampMs !== null)) {
      return [...parsed].sort(
        (a, b) =>
          (a.timestampMs ?? Number.MAX_SAFE_INTEGER) - (b.timestampMs ?? Number.MAX_SAFE_INTEGER),
      );
    }
    return parsed;
  },
};
