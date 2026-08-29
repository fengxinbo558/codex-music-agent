import type {
  CreativityLevel,
  GenerationPreferences,
  LyricClarity,
  LyricsMode,
  ToneProfile,
  VocalDelivery,
  VocalStyle,
} from "../types";
import { VOCAL_DELIVERY_PROFILES } from "./vocalDelivery";

export const DEFAULT_GENERATION_PREFERENCES: GenerationPreferences = {
  duration: 30,
  vocalStyle: "female",
  vocalDelivery: "natural",
  lyricClarity: "clear",
  lyricsMode: "auto",
  creativity: "balanced",
  variantCount: 2,
  toneProfile: "warm",
};

export const VOCAL_STYLE_LABELS: Record<VocalStyle, string> = {
  female: "女声",
  male: "男声",
  instrumental: "纯音乐",
};

export const VOCAL_DELIVERY_LABELS: Record<VocalDelivery, string> = {
  natural: VOCAL_DELIVERY_PROFILES.natural.label,
  angryRock: VOCAL_DELIVERY_PROFILES.angryRock.label,
  extremeScream: VOCAL_DELIVERY_PROFILES.extremeScream.label,
};

export const LYRIC_CLARITY_LABELS: Record<LyricClarity, string> = {
  natural: "自然融合",
  clear: "歌词清晰优先",
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
      ? "无人声"
      : VOCAL_DELIVERY_LABELS[preferences.vocalDelivery],
    preferences.vocalStyle === "instrumental"
      ? null
      : LYRIC_CLARITY_LABELS[preferences.lyricClarity],
    preferences.vocalStyle === "instrumental"
      ? "不演唱歌词"
      : LYRICS_MODE_LABELS[preferences.lyricsMode],
    CREATIVITY_LABELS[preferences.creativity],
    TONE_PROFILE_LABELS[preferences.toneProfile],
    `${preferences.variantCount} 个版本`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function estimateGenerationTime(preferences: GenerationPreferences) {
  const base = Math.max(1, Math.ceil(preferences.duration / 30));
  const max = base * preferences.variantCount;
  return preferences.variantCount === 1
    ? `大约 ${base} 分钟`
    : `大约 ${Math.max(2, max - 1)}–${max + 1} 分钟`;
}

export function getContentFitNotice(
  preferences: GenerationPreferences,
  promptCharacters: number,
  currentLyricsCharacters: number,
) {
  if (preferences.vocalStyle === "instrumental") return null;
  const characters =
    preferences.lyricsMode === "current"
      ? currentLyricsCharacters
      : promptCharacters;
  const comfortableCharacters = {
    30: 90,
    60: 180,
    90: 270,
    120: 360,
    180: 540,
    240: 720,
  }[preferences.duration];
  if (characters <= comfortableCharacters) return null;

  const suggestedDuration =
    preferences.duration === 30
      ? characters <= 180
        ? 60
        : 90
      : preferences.duration === 60
        ? 90
        : preferences.duration === 90
          ? 120
          : preferences.duration === 120
            ? 180
            : preferences.duration === 180
              ? 240
              : null;
  const action = suggestedDuration
    ? `建议改成 ${suggestedDuration} 秒。`
    : "建议精简文字，或分成两次续写。";

  return preferences.lyricsMode === "current"
    ? `当前歌词较长，${preferences.duration} 秒可能唱不完整。${action}`
    : `这段文案较长，AI 会提炼成歌词，不会逐字唱完。${action}`;
}
