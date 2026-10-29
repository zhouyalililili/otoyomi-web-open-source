// Port of KanaRomanizer.kt
const digraphs: Record<string, string> = {
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  てぃ: "ti",
  でぃ: "di",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
};

const singles: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "o",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ゔ: "vu",
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
};

const isLetter = (c: string) => /^[A-Za-z]$/.test(c);

function romanizationAt(text: string, index: number): string {
  if (index >= text.length) return "";
  const pair = text.substring(index, Math.min(index + 2, text.length));
  return digraphs[pair] ?? singles[text.charAt(index)] ?? "";
}

export const KanaRomanizer = {
  romanize(input: string): string {
    // UTF-16 code units, mirroring Kotlin Char semantics.
    let hiragana = "";
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      hiragana += code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : input[i];
    }
    let out = "";
    let index = 0;
    while (index < hiragana.length) {
      const char = hiragana.charAt(index);
      if (char === "っ") {
        const next = romanizationAt(hiragana, index + 1);
        const c = [...next].find((ch) => isLetter(ch) && !"aeioun".includes(ch.toLowerCase()));
        if (c) out += c;
        index++;
        continue;
      }
      if (char === "ー") {
        for (let i = out.length - 1; i >= 0; i--) {
          const v = out.charAt(i);
          if ("aeiou".includes(v.toLowerCase())) {
            out += v;
            break;
          }
        }
        index++;
        continue;
      }
      const pair = hiragana.substring(index, Math.min(index + 2, hiragana.length));
      const digraph = digraphs[pair];
      if (digraph !== undefined) {
        out += digraph;
        index += 2;
      } else {
        out += singles[char] ?? char;
        index++;
      }
    }
    return out;
  },
};
