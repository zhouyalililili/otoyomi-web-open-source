import {
  JapaneseRomanizer,
  LyricsAssembler,
  SingAlongConverter,
  whitespaceTokenizer,
  type JapaneseTokenizer,
} from "@/core";
import { loadKuromojiTokenizer } from "@/services/kuromoji-tokenizer";

let personalRules: Record<string, string> = {};
let activeTokenizer: JapaneseTokenizer = whitespaceTokenizer;
let preparation: Promise<void> | undefined;

const sharedTokenizer: JapaneseTokenizer = {
  tokenize: (line) => activeTokenizer.tokenize(line),
};

/** Called whenever the personal dictionary changes; every conversion afterwards uses it. */
export function setPronunciationRules(rules: Record<string, string>) {
  personalRules = rules;
}

export const getPronunciationRules = () => personalRules;

export const romanizer = new JapaneseRomanizer(sharedTokenizer);
export const assembler = new LyricsAssembler(romanizer, getPronunciationRules);

/**
 * Loads the same Kuromoji/IPADIC reading layer used by Android and installs it
 * into the shared assembler. Callers must await this before assembling Japanese lyrics.
 */
export function prepareJapaneseRomanizer(): Promise<void> {
  if (preparation) return preparation;
  preparation = loadKuromojiTokenizer()
    .then((tokenizer) => {
      activeTokenizer = tokenizer;
    })
    .catch((error: unknown) => {
      preparation = undefined;
      throw error;
    });
  return preparation;
}

export const convertSingAlong = (romaji: string) =>
  SingAlongConverter.convert(romaji, personalRules);
