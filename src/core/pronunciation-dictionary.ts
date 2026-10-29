// Personal pronunciation dictionary helpers. Mirrors SingAlongConverter's key rules.
import type { PronunciationOverride } from "@/types";
import { SingAlongConverter } from "./sing-along-converter";

export function normalizeRuleKey(value: string): string {
  return value
    .replace(/ā/giu, "aa")
    .replace(/ī/giu, "ii")
    .replace(/ū/giu, "uu")
    .replace(/ē/giu, "ee")
    .replace(/ō/giu, "ou")
    .toLowerCase()
    .trim();
}

export type RuleValidation =
  { ok: true; rule: PronunciationOverride } | { ok: false; error: string };

export function validateRule(romaji: string, singAlong: string): RuleValidation {
  const key = normalizeRuleKey(romaji);
  if (!key) return { ok: false, error: "请填写罗马音音节" };
  if (!/^[a-z]+$/.test(key)) return { ok: false, error: "罗马音只能包含英文字母" };
  if (!singAlong.trim()) return { ok: false, error: "请填写跟唱替换" };
  return { ok: true, rule: { romaji: key, singAlong: singAlong.trim() } };
}

/** Overrides -> map consumed by SingAlongConverter.convert / LyricsAssembler. */
export function rulesFromOverrides(overrides: PronunciationOverride[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of overrides) {
    const v = validateRule(o.romaji, o.singAlong);
    if (v.ok) out[v.rule.romaji] = v.rule.singAlong;
  }
  return out;
}

export interface DictionaryEntry {
  romaji: string;
  systemValue: string | null;
  customValue: string | null;
}

/** Merge system defaults with personal overrides for display, sorted by romaji. */
export function mergeDictionary(overrides: PronunciationOverride[]): DictionaryEntry[] {
  const system = SingAlongConverter.defaultRules();
  const custom = rulesFromOverrides(overrides);
  const keys = [...new Set([...Object.keys(system), ...Object.keys(custom)])].sort();
  return keys.map((romaji) => ({
    romaji,
    systemValue: system[romaji] ?? null,
    customValue: custom[romaji] ?? null,
  }));
}
