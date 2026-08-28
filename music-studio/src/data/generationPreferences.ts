import type {
  CreativityLevel,
  GenerationPreferences,
  LyricsMode,
  ToneProfile,
  VocalStyle,
} from "../types";

export const DEFAULT_GENERATION_PREFERENCES: GenerationPreferences = {
  duration: 30,
  vocalStyle: "female",
  lyricsMode: "auto",
  creativity: "balanced",
  variantCount: 1,
  toneProfile: "warm",
};

export const VOCAL_STYLE_LABELS: Record<VocalStyle, string> = {
  female: "女声",
  male: "男声",
  instrumental: "纯音乐",
};

export const LYRICS_MODE_LABELS: Record<LyricsMode, string> = {
  auto: "AI 自动写词",
  current: "使用当前歌词",
};

export const CREATIVITY_LABELS: Record<CreativityLevel, string> = {
  stable: "稳一点",
  balanced: "均衡",
  surprise: "有惊喜",
};

export const TONE_PROFILE_LABELS: Record<ToneProfile, string> = {
  warm: "温暖细腻",
  natural: "自然原声",
  bright: "清晰明亮",
};

export function normalizeGenerationPreferences(
  value: Partial<GenerationPreferences> | null | undefined,
): GenerationPreferences {
  return { ...DEFAULT_GENERATION_PREFERENCES, ...value };
}

export function summarizePreferences(preferences: GenerationPreferences) {
  return [
    `${preferences.duration} 秒`,
    VOCAL_STYLE_LABELS[preferences.vocalStyle],
    preferences.vocalStyle === "instrumental"
      ? "不演唱歌词"
      : LYRICS_MODE_LABELS[preferences.lyricsMode],
    CREATIVITY_LABELS[preferences.creativity],
    TONE_PROFILE_LABELS[preferences.toneProfile],
    `${preferences.variantCount} 个版本`,
  ].join(" · ");
}

export function estimateGenerationTime(preferences: GenerationPreferences) {
  const base =
    preferences.duration === 30 ? 1 : preferences.duration === 60 ? 2 : 3;
  const max = base * preferences.variantCount;
  return preferences.variantCount === 1
    ? `大约 ${base} 分钟`
    : `大约 ${Math.max(2, max - 1)}–${max + 1} 分钟`;
}
