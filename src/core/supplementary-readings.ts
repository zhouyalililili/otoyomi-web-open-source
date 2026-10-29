// Local supplementary readings for words missing from IPADIC.
// Keys are surface forms; values are kana readings that still go through KanaRomanizer.
// Checked before the tokenizer's own reading. Extend only with confirmed readings.
export const SUPPLEMENTARY_READINGS: Readonly<Record<string, string>> = {
  昏い: "くらい",
};
