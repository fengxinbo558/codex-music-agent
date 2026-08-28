import type { AgentPlanResponse, PlanMusicRequest } from "../types";

const includesAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

export function createFallbackPlan(
  request: PlanMusicRequest,
): AgentPlanResponse {
  const prompt = request.prompt.trim();
  const lower = prompt.toLowerCase();
  const isNight = includesAny(prompt, ["夜", "凌晨", "雨", "城市", "路灯"]);
  const isWarm = includesAny(prompt, ["温暖", "治愈", "阳光", "希望"]);
  const isFast = includesAny(prompt, [
    "快",
    "燃",
    "跳舞",
    "摇滚",
    "电子",
    "鼓点",
  ]);
  const isEnglish = includesAny(lower, ["english", "英文", "英语"]);
  const bpm = isFast
    ? 124
    : isNight
      ? 82
      : isWarm
        ? 96
        : request.currentProject.bpm;
  const genre = includesAny(lower, ["r&b", "rnb"])
    ? "Alternative R&B"
    : includesAny(lower, ["摇滚", "rock"])
      ? "Indie Rock"
      : includesAny(lower, ["电子", "electronic"])
        ? "Downtempo Electronic"
        : "Indie Pop";

  return {
    source: "local",
    warning: "Codex 暂未连接，本次由内置音乐规划器完成。",
    brief: {
      title: isNight ? "雨停以前" : isWarm ? "向光而行" : "未寄出的回声",
      summary: prompt || "保留当前歌曲气质，生成一版更完整、有情绪推进的编曲。",
      genre,
      mood: isNight
        ? "克制、潮湿、逐渐释然"
        : isWarm
          ? "温暖、明亮、有希望"
          : "亲密、内省、有留白",
      bpm,
      key: isNight ? "A minor" : request.currentProject.key,
      language: isEnglish ? "English" : "中文",
      vocalMode: "自然近讲式主唱，副歌加入轻和声",
      instruments: isFast
        ? ["电子鼓", "合成贝斯", "清音电吉他", "氛围合成器"]
        : ["木吉他", "软鼓组", "暖色贝斯", "环境质感", "副歌和声"],
      structure: ["前奏 8 小节", "主歌", "预副歌", "副歌", "短尾奏"],
      lyrics: [
        "城市把晚风折进衣角",
        "车窗里的人各自沉默",
        "我把没说完的话唱得很轻",
        "等一场雨替我们经过",
      ],
      preserve:
        request.selection.length > 0
          ? request.selection.map((item) => `保留已选择片段：${item}`)
          : ["保留当前旋律方向", "不覆盖已有版本"],
      change: ["建立完整段落推进", "副歌增加动态和声", `速度调整为 ${bpm} BPM`],
      provider: "自动选择（ACE-Step 优先）",
      costLabel: "本地模型优先 · 不产生按次 API 费用",
    },
  };
}
