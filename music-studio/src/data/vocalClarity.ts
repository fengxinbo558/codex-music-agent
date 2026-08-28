import type { LyricClarity, VocalStyle } from "../types";

type VocalClarityDefinition = {
  label: string;
  description: string;
  positive: string;
  negative: string;
  shift: number;
  lmCfgScale: number;
};

export const VOCAL_CLARITY_PROFILES: Record<
  LyricClarity,
  VocalClarityDefinition
> = {
  natural: {
    label: "自然融合",
    description: "人声与伴奏自然融合，保留更多空间感",
    positive: "natural vocal balance, expressive phrasing",
    negative: "unintelligible mumbling, digital clipping",
    shift: 1,
    lmCfgScale: 2,
  },
  clear: {
    label: "歌词清晰优先",
    description: "人声靠前、少混响，强化中文咬字",
    positive:
      "front-and-center close-miked vocal, precise Mandarin Chinese initials and finals, clearly separated lyric syllables, restrained vocal reverb, dry intimate vocal presence, sparse midrange arrangement leaving space for the lead vocal",
    negative:
      "mumbled or swallowed lyrics, blurred consonants, slurred articulation, excessive vocal reverb or delay, buried lead vocal, dense instruments masking the vocal, piercing sibilance, digital clipping",
    shift: 3,
    lmCfgScale: 2.4,
  },
};

export function vocalClarityPrompt(
  clarity: LyricClarity,
  vocalStyle: VocalStyle,
) {
  if (vocalStyle === "instrumental") {
    return { positive: "", negative: "", shift: 1, lmCfgScale: 2 };
  }
  const definition = VOCAL_CLARITY_PROFILES[clarity];
  return {
    positive: definition.positive,
    negative: definition.negative,
    shift: definition.shift,
    lmCfgScale: definition.lmCfgScale,
  };
}
