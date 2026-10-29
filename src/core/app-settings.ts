// User preferences model with defaults and defensive normalisation. Pure TS.
import { snapSpeed, type PracticeSpeed } from "./practice-timeline";

export const BACKGROUND_PRESETS = ["dawn", "sakura", "sea", "night"] as const;
export type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number];

export interface AppSettings {
  showJapanese: boolean;
  showRomaji: boolean;
  showSingAlong: boolean;
  /** Lyric font scale, 0.8 – 1.6. */
  fontScale: number;
  defaultSpeed: PracticeSpeed;
  /** Dark overlay opacity over practice background, 0 – 0.9. */
  overlayOpacity: number;
  defaultBackground: BackgroundPreset;
}

export const DEFAULT_SETTINGS: AppSettings = {
  showJapanese: true,
  showRomaji: true,
  showSingAlong: true,
  fontScale: 1,
  defaultSpeed: 1,
  overlayOpacity: 0.45,
  defaultBackground: "dawn",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);

export function normalizeSettings(input: unknown): AppSettings {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const bg = o["defaultBackground"];
  return {
    showJapanese: bool(o["showJapanese"], DEFAULT_SETTINGS.showJapanese),
    showRomaji: bool(o["showRomaji"], DEFAULT_SETTINGS.showRomaji),
    showSingAlong: bool(o["showSingAlong"], DEFAULT_SETTINGS.showSingAlong),
    fontScale:
      Math.round(clamp(num(o["fontScale"], DEFAULT_SETTINGS.fontScale), 0.8, 1.6) * 10) / 10,
    defaultSpeed: snapSpeed(num(o["defaultSpeed"], DEFAULT_SETTINGS.defaultSpeed)),
    overlayOpacity:
      Math.round(clamp(num(o["overlayOpacity"], DEFAULT_SETTINGS.overlayOpacity), 0, 0.9) * 100) /
      100,
    defaultBackground: BACKGROUND_PRESETS.includes(bg as BackgroundPreset)
      ? (bg as BackgroundPreset)
      : DEFAULT_SETTINGS.defaultBackground,
  };
}
