import type { ToneProfile, VocalStyle } from "../types";

export type MasteringProfile = {
  warmth: { frequency: number; gain: number; q: number };
  presence: { frequency: number; gain: number; q: number };
  highShelf: { frequency: number; gain: number };
  compressor: {
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
  };
  targetPeakDb: number;
};

type ToneProfileDefinition = {
  label: string;
  description: string;
  fingerprint: number[];
  positive: string;
  vocalPositive: string;
  negative: string;
  vocalNegative: string;
  mastering: MasteringProfile;
};

export const TONE_PROFILES: Record<ToneProfile, ToneProfileDefinition> = {
  warm: {
    label: "温暖细腻",
    description: "柔和高频，保留呼吸和细微情绪",
    fingerprint: [72, 66, 52, 35, 22],
    positive:
      "warm analog tone, smooth upper mids, controlled airy highs, subtle microdynamics, spacious evolving arrangement",
    vocalPositive:
      "intimate emotionally nuanced vocal, natural breath, gentle consonants, humanized phrasing and timing, restrained but layered emotional progression",
    negative:
      "brittle or metallic timbre, piercing high frequencies, harsh upper mids, over-compressed dynamics, rigid quantized timing, flat dynamics",
    vocalNegative:
      "piercing sibilance, robotic phrasing, mechanical pronunciation, emotionless vocal, shouted high notes",
    mastering: {
      warmth: { frequency: 320, gain: 0.8, q: 0.72 },
      presence: { frequency: 3_200, gain: -1.6, q: 0.9 },
      highShelf: { frequency: 6_200, gain: -2.4 },
      compressor: {
        threshold: -18,
        knee: 14,
        ratio: 2,
        attack: 0.028,
        release: 0.24,
      },
      targetPeakDb: -1,
    },
  },
  natural: {
    label: "自然原声",
    description: "轻度修整，尽量保留原本空气感",
    fingerprint: [50, 56, 58, 53, 46],
    positive:
      "natural balanced tone, open dynamics, realistic acoustic detail, unforced arrangement with breathing room",
    vocalPositive:
      "natural expressive vocal, believable breath and timing, subtle emotional dynamics, relaxed consonants",
    negative:
      "metallic timbre, piercing resonances, excessive loudness, flattened dynamics, rigid quantized timing",
    vocalNegative:
      "piercing sibilance, robotic phrasing, mechanical pronunciation, exaggerated belting",
    mastering: {
      warmth: { frequency: 320, gain: 0.35, q: 0.72 },
      presence: { frequency: 3_200, gain: -0.8, q: 0.9 },
      highShelf: { frequency: 6_400, gain: -0.9 },
      compressor: {
        threshold: -16,
        knee: 12,
        ratio: 1.55,
        attack: 0.032,
        release: 0.22,
      },
      targetPeakDb: -1,
    },
  },
  bright: {
    label: "清晰明亮",
    description: "保持通透，同时控制尖锐和削波",
    fingerprint: [34, 42, 54, 66, 76],
    positive:
      "clear polished tone, open controlled highs, articulate detail, lively dynamics and clean spacious arrangement",
    vocalPositive:
      "clear expressive vocal, natural breath, articulate but gentle consonants, humanized phrasing",
    negative:
      "brittle metallic timbre, piercing resonances, harsh upper mids, clipped transients, over-compressed dynamics",
    vocalNegative:
      "piercing sibilance, robotic phrasing, mechanical pronunciation, shrill shouted vocal",
    mastering: {
      warmth: { frequency: 300, gain: 0.15, q: 0.72 },
      presence: { frequency: 3_400, gain: -0.65, q: 1 },
      highShelf: { frequency: 7_200, gain: 0.25 },
      compressor: {
        threshold: -15,
        knee: 10,
        ratio: 1.5,
        attack: 0.025,
        release: 0.2,
      },
      targetPeakDb: -1,
    },
  },
};

export function tonePrompt(profile: ToneProfile, vocalStyle: VocalStyle) {
  const definition = TONE_PROFILES[profile];
  const hasVocal = vocalStyle !== "instrumental";
  return {
    positive: [definition.positive, hasVocal ? definition.vocalPositive : ""]
      .filter(Boolean)
      .join(", "),
    negative: [definition.negative, hasVocal ? definition.vocalNegative : ""]
      .filter(Boolean)
      .join(", "),
  };
}
