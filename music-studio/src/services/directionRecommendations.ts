import type {
  AgentPlanResponse,
  DirectionCandidate,
  GenerationPreferences,
  MusicBrief,
} from "../types";

export function createDirectionRecommendations(
  plan: AgentPlanResponse,
  preferences: GenerationPreferences,
): DirectionCandidate[] {
  const base = plan.brief;
  const safeBpm = clamp(
    Math.round(base.bpm * 0.9),
    68,
    preferences.lyricClarity === "clear" ? 108 : 118,
  );
  const boldBpm = clamp(base.bpm + (base.bpm >= 125 ? 10 : 16), 88, 168);
  const durationSeconds = preferences.duration;
  return [
    {
      id: "recommended",
      kind: "recommended",
      label: "推荐方案",
      reason: "最贴近你的原始想法，同时兼顾模型稳定性和歌词清晰度。",
      durationSeconds,
      voiceTexture: voiceTexture(base.vocalMode, "recommended"),
      brief: cloneBrief(base),
    },
    {
      id: "safe",
      kind: "safe",
      label: "稳妥方案",
      reason: "速度稍慢、段落更清楚，给中文咬字和情绪铺垫留出空间。",
      durationSeconds,
      voiceTexture: voiceTexture(base.vocalMode, "safe"),
      brief: {
        ...cloneBrief(base),
        title: `${base.title} · 清晰版`,
        mood: softenMood(base.mood),
        bpm: safeBpm,
        vocalMode: `自然、清晰、少装饰；${base.vocalMode}`,
        instruments: simplifyInstruments(base.instruments),
        structure: ["短前奏", "主歌", "预副歌", "副歌", "副歌回收", "尾奏"],
      },
    },
    {
      id: "bold",
      kind: "bold",
      label: "大胆方案",
      reason: "加强节奏对比和副歌爆发，辨识度更高，但演唱与生成难度也更高。",
      durationSeconds,
      voiceTexture: voiceTexture(base.vocalMode, "bold"),
      brief: {
        ...cloneBrief(base),
        title: `${base.title} · 爆发版`,
        mood: intensifyMood(base.mood),
        bpm: boldBpm,
        vocalMode: `主歌克制、副歌爆发、重点词强调；${base.vocalMode}`,
        instruments: boldInstruments(base.instruments),
        structure: ["钩子开场", "主歌蓄力", "预副歌抬升", "爆发副歌", "反差桥段", "终极副歌"],
      },
    },
  ];
}

export function directionToPlan(
  direction: DirectionCandidate,
  sourcePlan: AgentPlanResponse,
): AgentPlanResponse {
  return {
    ...sourcePlan,
    brief: cloneBrief(direction.brief),
  };
}

function cloneBrief(brief: MusicBrief): MusicBrief {
  return {
    ...brief,
    instruments: [...brief.instruments],
    structure: [...brief.structure],
    lyrics: [...brief.lyrics],
    preserve: [...brief.preserve],
    change: [...brief.change],
  };
}

function voiceTexture(vocalMode: string, kind: DirectionCandidate["kind"]) {
  if (kind === "safe") return "近讲、清楚、自然呼吸";
  if (kind === "bold") return "颗粒感、强对比、副歌爆发";
  if (/嘶吼|怒声|沙哑|scream/i.test(vocalMode)) return "受控沙哑、力量感、清楚咬字";
  return "贴耳、细腻、保留呼吸感";
}

function softenMood(mood: string) {
  return mood
    .replace(/猛烈|爆发|愤怒/g, "有力量")
    .replace(/压迫/g, "克制")
    .concat("、清楚推进");
}

function intensifyMood(mood: string) {
  return `${mood}、强烈反差、最终释放`;
}

function simplifyInstruments(instruments: string[]) {
  const unique = [...new Set(instruments)];
  return unique.slice(0, Math.max(3, Math.min(4, unique.length)));
}

function boldInstruments(instruments: string[]) {
  return [...new Set([...instruments, "冲击鼓组", "副歌层叠和声", "反差氛围层"])].slice(0, 7);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
