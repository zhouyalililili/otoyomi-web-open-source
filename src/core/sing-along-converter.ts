// Port of SingAlongConverter.kt
const defaultReplacements: Record<string, string> = {
  a: "啊",
  i: "衣",
  u: "乌",
  e: "诶",
  o: "哦",
  n: "嗯",
  ka: "卡",
  ki: "ki",
  ku: "哭",
  ke: "开",
  ko: "扣",
  ga: "嘎",
  gi: "gi",
  gu: "咕",
  ge: "给",
  go: "够",
  sa: "撒",
  shi: "西",
  si: "西",
  su: "苏",
  se: "塞",
  so: "搜",
  za: "扎",
  ji: "几",
  zi: "几",
  zu: "组",
  ze: "贼",
  zo: "走",
  ta: "他",
  chi: "七",
  tsu: "粗",
  te: "忒",
  to: "托",
  da: "达",
  de: "得",
  do: "多",
  na: "那",
  ni: "你",
  nu: "努",
  ne: "内",
  no: "诺",
  ha: "哈",
  hi: "hi",
  fu: "夫",
  hu: "夫",
  he: "嘿",
  ho: "后",
  ba: "八",
  bi: "比",
  bu: "布",
  be: "贝",
  bo: "波",
  pa: "怕",
  pi: "皮",
  pu: "扑",
  pe: "佩",
  po: "坡",
  ma: "妈",
  mi: "米",
  mu: "木",
  me: "美",
  mo: "莫",
  ya: "呀",
  yu: "优",
  yo: "哟",
  ra: "拉",
  ri: "里",
  ru: "路",
  re: "类",
  ro: "楼",
  wa: "哇",
  wo: "哦",
  kya: "卡呀",
  kyu: "ki优",
  kyo: "ki哟",
  gya: "gi呀",
  gyu: "gi优",
  gyo: "gi哟",
  sha: "夏",
  sya: "夏",
  shu: "修",
  syu: "修",
  sho: "秀",
  syo: "秀",
  ja: "加",
  jya: "加",
  zya: "加",
  ju: "就",
  jyu: "就",
  zyu: "就",
  jo: "久",
  jyo: "久",
  zyo: "久",
  cha: "恰",
  tya: "恰",
  chu: "秋",
  tyu: "秋",
  cho: "丘",
  tyo: "丘",
  nya: "尼呀",
  nyu: "尼优",
  nyo: "尼哟",
  hya: "hi呀",
  hyu: "hi优",
  hyo: "hi哟",
  bya: "比呀",
  byu: "比优",
  byo: "比哟",
  pya: "皮呀",
  pyu: "皮优",
  pyo: "皮哟",
  mya: "米呀",
  myu: "米优",
  myo: "米哟",
  rya: "里呀",
  ryu: "里优",
  ryo: "里哟",
  fa: "发",
  fi: "菲",
  fe: "费",
  fo: "佛",
  va: "瓦",
  vi: "维",
  vu: "乌",
  ve: "威",
  vo: "沃",
  wi: "乌衣",
  we: "乌诶",
  ye: "衣诶",
  she: "西诶",
  je: "几诶",
  che: "七诶",
  tsa: "粗啊",
  tsi: "粗衣",
  tse: "粗诶",
  tso: "粗哦",
  kwa: "哭哇",
  gwa: "咕哇",
  ti: "提",
  tu: "图",
  di: "迪",
  du: "杜",
};

const isAsciiLetter = (c: string) => /^[A-Za-z]$/.test(c);

function normalizeRomaji(value: string): string {
  return value
    .replace(/ā/giu, "aa")
    .replace(/ī/giu, "ii")
    .replace(/ū/giu, "uu")
    .replace(/ē/giu, "ee")
    .replace(/ō/giu, "ou");
}

function isValidRuleKey(value: string): boolean {
  return value.trim().length > 0 && [...value].every(isAsciiLetter);
}

function convertWord(word: string, replacements: Record<string, string>, tokens: string[]): string {
  let acronymLength = 0;
  while (
    acronymLength < word.length &&
    word.charAt(acronymLength) >= "A" &&
    word.charAt(acronymLength) <= "Z"
  )
    acronymLength++;
  if (acronymLength >= 2 && acronymLength < word.length) {
    return (
      word.slice(0, acronymLength) + convertWord(word.slice(acronymLength), replacements, tokens)
    );
  }
  let converted = "";
  let index = 0;
  const lower = word.toLowerCase();
  while (index < word.length) {
    const match = tokens.find((token) => lower.startsWith(token, index));
    if (match !== undefined) {
      converted += replacements[match]!;
      index += match.length;
      continue;
    }
    const char = lower.charAt(index);
    const isGemination =
      index + 1 < word.length && char === lower.charAt(index + 1) && !"aeioun".includes(char);
    if (!isGemination) return word;
    index++;
  }
  return converted;
}

export const SingAlongConverter = {
  defaultRules(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.keys(defaultReplacements).sort())
      result[key] = defaultReplacements[key]!;
    return result;
  },

  convert(romaji: string, personalReplacements: Record<string, string> = {}): string {
    // A sing-along hint must only be derived from romaji. Never echo Japanese,
    // Chinese translations, or mojibake into the generated Chinese layer.
    if ([...romaji].some((char) => char.charCodeAt(0) > 127 && !"āīūēōĀĪŪĒŌ".includes(char)))
      return "";
    const replacements: Record<string, string> = { ...defaultReplacements };
    for (const [key, value] of Object.entries(personalReplacements)) {
      const k = normalizeRomaji(key).toLowerCase().trim();
      if (isValidRuleKey(k) && value.trim().length > 0) replacements[k] = value;
    }
    // Stable sort: longest syllable first.
    const tokens = Object.keys(replacements).sort((a, b) => b.length - a.length);
    const normalized = normalizeRomaji(romaji);
    let out = "";
    let index = 0;
    while (index < normalized.length) {
      if (!isAsciiLetter(normalized.charAt(index))) {
        out += normalized.charAt(index++);
        continue;
      }
      let end = index;
      while (end < normalized.length && isAsciiLetter(normalized.charAt(end))) end++;
      out += convertWord(normalized.substring(index, end), replacements, tokens);
      index = end;
    }
    return out;
  },
};
