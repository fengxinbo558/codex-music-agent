import type { LyricWritingStyle, MusicBrief } from "../types";

export type LyricWritingStyleGuide = {
  id: LyricWritingStyle;
  label: string;
  tagline: string;
  description: string;
  example: string;
  suitableFor: string;
  watchOut: string;
  recommended: boolean;
  reason: string;
  score: number;
};

const BASE_GUIDES: Array<Omit<LyricWritingStyleGuide, "recommended" | "reason" | "score">> = [
  {
    id: "conversational",
    label: "口语叙事",
    tagline: "像真的在对一个人说话",
    description: "用日常词语讲清人物、动作和变化，最容易听懂。",
    example: "我绕了很远的路 / 还是开回你住过的街",
    suitableFor: "第一次写词、故事歌、流行与民谣",
    watchOut: "不要把每句都写成说明书，副歌仍要有一句钩子。",
  },
  {
    id: "poetic",
    label: "现代诗意象",
    tagline: "少解释，多留画面和余味",
    description: "用光、雨、城市、季节等意象承接情绪，画面感更强。",
    example: "路灯把雨折成两半 / 一半落在后视镜",
    suitableFor: "独立流行、氛围音乐、含蓄和内省情绪",
    watchOut: "意象不宜堆太多，至少保留一条听众能听懂的故事线。",
  },
  {
    id: "dialogue",
    label: "对话体",
    tagline: "把聊天记录变成能唱的对白",
    description: "用“你说 / 我说 / 没发出的回复”推进关系，代入感直接。",
    example: "你说最近还好吗 / 我打了又删掉一句回答",
    suitableFor: "聊天记录、短视频剧情、关系冲突",
    watchOut: "原文太长时要拆成短句，不能期待模型逐字念完整篇。",
  },
  {
    id: "prose",
    label: "散文感",
    tagline: "像一封有旋律的信",
    description: "保留较完整的叙述和细节，语气自然，适合慢慢铺陈。",
    example: "那天你走得很慢，像在等我把最后一句话说完",
    suitableFor: "回忆、家人、成长、长线叙事",
    watchOut: "长句要在演唱前拆行，否则容易咬字模糊。",
  },
  {
    id: "hook",
    label: "短句钩子",
    tagline: "先写一句让人立刻记住的话",
    description: "减少解释，用短句、重复和重音制造强副歌。",
    example: "我不认输 / 我不替沉默认错",
    suitableFor: "摇滚、电子、怒音、副歌爆发与短视频片段",
    watchOut: "重复要有推进，不要整首只有口号。",
  },
];

export function recommendLyricWritingStyles(input: {
  idea: string;
  brief?: MusicBrief | null;
}): LyricWritingStyleGuide[] {
  const signal = [input.idea, input.brief?.genre, input.brief?.mood, input.brief?.vocalMode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const scores: Record<LyricWritingStyle, number> = {
    conversational: 4,
    poetic: 2,
    dialogue: 1,
    prose: 1,
    hook: 2,
  };

  addScore(scores, signal, "dialogue", ["对话", "聊天", "微信", "短信", "你说", "我说"], 7);
  addScore(scores, signal, "poetic", ["氛围", "内省", "含蓄", "夜", "雨", "indie", "民谣"], 4);
  addScore(scores, signal, "hook", ["摇滚", "怒", "嘶吼", "爆发", "rock", "电子", "短视频"], 6);
  addScore(scores, signal, "prose", ["回忆", "成长", "家人", "故事", "散文", "一封信"], 5);
  addScore(scores, signal, "conversational", ["清楚", "自然", "叙事", "流行", "民谣"], 3);

  const topIds = Object.entries(scores)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([id]) => id as LyricWritingStyle);

  return BASE_GUIDES.map((guide) => ({
    ...guide,
    score: scores[guide.id],
    recommended: topIds.includes(guide.id),
    reason: recommendationReason(guide.id, signal, topIds[0] === guide.id),
  })).sort((left, right) => right.score - left.score);
}

export function recommendedLyricWritingStyle(input: {
  idea: string;
  brief?: MusicBrief | null;
}) {
  return recommendLyricWritingStyles(input)[0].id;
}

export function lyricWritingStyleLabel(style: LyricWritingStyle) {
  return BASE_GUIDES.find((guide) => guide.id === style)?.label ?? "口语叙事";
}

function addScore(
  scores: Record<LyricWritingStyle, number>,
  signal: string,
  style: LyricWritingStyle,
  keywords: string[],
  points: number,
) {
  if (keywords.some((keyword) => signal.includes(keyword))) scores[style] += points;
}

function recommendationReason(
  id: LyricWritingStyle,
  signal: string,
  first: boolean,
) {
  if (first && id === "hook") return "当前方向强调爆发与记忆点，短句更利于怒音和清楚咬字。";
  if (first && id === "dialogue") return "你的素材接近真实对话，这种写法能保留人物关系和说话感。";
  if (first && id === "poetic") return "当前情绪偏含蓄和氛围感，用少量意象能增加画面。";
  if (first && id === "prose") return "当前内容依赖完整故事，散文感能保留更多细节。";
  if (first) return "这是最稳妥的新人起点：先把故事说清楚，再增加修辞。";
  if (id === "conversational") return "适合作为清晰度基线，方便检查每句是否自然。";
  if (id === "hook" && /副歌|摇滚|爆发/.test(signal)) return "可用来加强副歌，但不建议整首都写成口号。";
  return "可作为备选写法；先看参考句是否接近你想要的说话方式。";
}
