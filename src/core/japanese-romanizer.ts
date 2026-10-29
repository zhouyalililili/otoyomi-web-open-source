// Port of JapaneseRomanizer.kt with the tokenizer decoupled behind an interface,
// plus a supplementary reading layer for words IPADIC lacks.
import { KanaRomanizer } from "./kana-romanizer";
import { SUPPLEMENTARY_READINGS } from "./supplementary-readings";
import { kotlinLines } from "./text";

export interface Token {
  surface: string;
  /** Katakana/hiragana reading; null or "*" when unknown. */
  reading?: string | null;
}

/** Morphological analyzer contract (e.g. a kuromoji adapter, injected by the app layer). */
export interface JapaneseTokenizer {
  tokenize(line: string): Token[];
}

/** Dependency-free fallback: splits on whitespace and uses the surface as reading (kana-only text). */
export const whitespaceTokenizer: JapaneseTokenizer = {
  tokenize: (line) =>
    line
      .split(/\s+/)
      .filter(Boolean)
      .map((surface) => ({ surface })),
};

const KANJI = /[\u3400-\u9fff\uf900-\ufaff々〆]/u;

/**
 * Splits a line around supplementary dictionary surfaces (longest match first) so those words
 * get their confirmed reading regardless of how the tokenizer would cut them; the remaining
 * segments are tokenized normally.
 */
export function tokenizeWithSupplementary(
  line: string,
  tokenizer: JapaneseTokenizer,
  dictionary: Readonly<Record<string, string>> = SUPPLEMENTARY_READINGS,
): Token[] {
  const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
  const out: Token[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push(...tokenizer.tokenize(buffer));
    buffer = "";
  };
  let i = 0;
  while (i < line.length) {
    const key = keys.find((k) => line.startsWith(k, i));
    if (key) {
      flush();
      out.push({ surface: key, reading: dictionary[key]! });
      i += key.length;
    } else {
      buffer += line.charAt(i++);
    }
  }
  flush();
  return out;
}

export class JapaneseRomanizer {
  constructor(
    private readonly tokenizer: JapaneseTokenizer = whitespaceTokenizer,
    private readonly supplementary: Readonly<Record<string, string>> = SUPPLEMENTARY_READINGS,
  ) {}

  romanize(text: string): string {
    return kotlinLines(text)
      .map((l) => this.romanizeLine(l))
      .join("\n");
  }

  /** Returns "" when any kanji token has no known reading; never echoes kanji as romaji. */
  romanizeLine(line: string): string {
    if (line.trim() === "") return "";
    const tokens = tokenizeWithSupplementary(line, this.tokenizer, this.supplementary);
    const parts: string[] = [];
    for (const t of tokens) {
      const reading = t.reading && t.reading !== "*" ? t.reading : null;
      if (!reading && KANJI.test(t.surface)) return "";
      parts.push(KanaRomanizer.romanize(reading ?? t.surface));
    }
    return parts
      .join(" ")
      .replace(/\s+([、。！？,.!?])/g, "$1")
      .trim();
  }
}
