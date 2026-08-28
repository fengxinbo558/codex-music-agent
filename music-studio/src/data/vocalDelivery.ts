import type { VocalDelivery, VocalStyle } from "../types";

type VocalDeliveryDefinition = {
  label: string;
  description: string;
  plannerDirection: string;
  positive: string;
  negative: string;
};

export const VOCAL_DELIVERY_PROFILES: Record<
  VocalDelivery,
  VocalDeliveryDefinition
> = {
  natural: {
    label: "自然演唱",
    description: "保留自然咬字与情绪起伏",
    plannerDirection: "按用户素材写自然、可演唱的原创歌词。",
    positive: "",
    negative: "",
  },
  angryRock: {
    label: "怒声摇滚",
    description: "沙哑爆发，歌词仍尽量清楚",
    plannerDirection:
      "把用户素材改写成短句、重音明确、带反抗与爆发感的摇滚歌词；主歌积压情绪，副歌集中释放，并保留清晰中文咬字。",
    positive:
      "aggressive Chinese rock vocal, controlled rasp and vocal fry, powerful chest-voice belt, explosive chorus, clear lyric articulation, distorted electric guitars, forceful live drums, driving bass, dynamic tension and release",
    negative:
      "thin shrill screaming, uncontrolled yelling, piercing upper mids, harsh sibilance, digital clipping, brittle distortion, unintelligible mumbling",
  },
  extremeScream: {
    label: "极限嘶吼",
    description: "Scream / Growl，更重更凶",
    plannerDirection:
      "把用户素材改写成适合 scream / growl 的重型歌词；使用更短的句子、强重拍和可重复的核心钩子，可以安排清唱与嘶吼对比。",
    positive:
      "extreme metal harsh vocal, controlled scream and deep growl, forceful rhythmic phrasing, short shouted hooks, heavy distorted guitars, hard-hitting drums, stop-start impact, optional clean-to-harsh contrast",
    negative:
      "thin high-pitched screech, uncontrolled noise, piercing sustained highs, digital clipping, aliasing, weak breathy scream, flat synthetic growl",
  },
};

export function vocalDeliveryPrompt(
  delivery: VocalDelivery,
  vocalStyle: VocalStyle,
) {
  if (vocalStyle === "instrumental") return { positive: "", negative: "" };
  const definition = VOCAL_DELIVERY_PROFILES[delivery];
  return {
    positive: definition.positive,
    negative: definition.negative,
  };
}

export function vocalDeliveryPlannerDirection(delivery: VocalDelivery) {
  return VOCAL_DELIVERY_PROFILES[delivery].plannerDirection;
}
