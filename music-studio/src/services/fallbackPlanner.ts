import type { AgentPlanResponse, PlanMusicRequest } from "../types";
import { vocalDeliveryPlannerDirection } from "../data/vocalDelivery";

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
  const isAngryRock = request.vocalDelivery === "angryRock";
  const isExtremeScream = request.vocalDelivery === "extremeScream";
  const isAggressive = isAngryRock || isExtremeScream;
  const bpm = isExtremeScream
    ? 148
    : isAngryRock
      ? 132
      : isFast
        ? 124
        : isNight
          ? 82
          : isWarm
            ? 96
            : request.currentProject.bpm;
  const genre = isExtremeScream
    ? "Modern Metalcore"
    : isAngryRock
      ? "Alternative Hard Rock"
      : includesAny(lower, ["r&b", "rnb"])
        ? "Alternative R&B"
        : includesAny(lower, ["摇滚", "rock"])
          ? "Indie Rock"
          : includesAny(lower, ["电子", "electronic"])
            ? "Downtempo Electronic"
            : "Indie Pop";
  const theme = extractTheme(prompt);

  return {
    source: "local",
    warning: "智能规划暂未连接，本次由本机音乐规划器完成。",
    brief: {
      title: isExtremeScream
        ? "撕开沉默"
        : isAngryRock
          ? "不再低头"
          : isNight
            ? "雨停以前"
            : isWarm
              ? "向光而行"
              : "未寄出的回声",
      summary: isAggressive
        ? `以“${theme}”为核心，做一首有压迫、反抗和爆发推进的歌。`
        : `以“${theme}”为核心，整理成有完整情绪推进的歌曲。`,
      genre,
      mood: isExtremeScream
        ? "压迫、愤怒、猛烈释放"
        : isAngryRock
          ? "积压、反抗、副歌爆发"
          : isNight
            ? "克制、潮湿、逐渐释然"
            : isWarm
              ? "温暖、明亮、有希望"
              : "亲密、内省、有留白",
      bpm,
      key: isNight ? "A minor" : request.currentProject.key,
      language: isEnglish ? "English" : "中文",
      vocalMode: vocalMode(request.vocalDelivery),
      instruments: isExtremeScream
        ? ["降调失真吉他", "重型贝斯", "强力鼓组", "冲击停顿", "噪声氛围"]
        : isAngryRock
          ? ["失真电吉他", "现场感鼓组", "推进贝斯", "副歌吉他墙"]
          : isFast
            ? ["电子鼓", "合成贝斯", "清音电吉他", "氛围合成器"]
            : ["木吉他", "软鼓组", "暖色贝斯", "环境质感", "副歌和声"],
      structure: isAggressive
        ? ["压迫感前奏", "主歌蓄力", "预副歌抬升", "爆发副歌", "重击尾奏"]
        : ["前奏 8 小节", "主歌", "预副歌", "副歌", "短尾奏"],
      lyrics: fallbackLyrics(theme, request.vocalDelivery, prompt),
      preserve:
        request.selection.length > 0
          ? request.selection.map((item) => `保留已选择片段：${item}`)
          : ["保留当前旋律方向", "不覆盖已有版本"],
      change: [
        "建立完整段落推进",
        vocalDeliveryPlannerDirection(request.vocalDelivery),
        `速度调整为 ${bpm} BPM`,
      ],
      provider: "自动选择（ACE-Step 优先）",
      costLabel: "本地模型优先 · 不产生按次 API 费用",
    },
  };
}

function extractTheme(prompt: string) {
  const withoutDirections = prompt.replace(/\[[^\]]+\]/g, " ").trim();
  const sentences = withoutDirections
    .split(/[。！？!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const contentSentence =
    sentences.find(
      (sentence) =>
        !/(写|做|生成|制作).{0,10}(歌|音乐)|根据.{0,12}内容/.test(sentence),
    ) ??
    sentences.at(-1) ??
    "压住太久的声音";
  return contentSentence
    .replace(/^[，,：:\s]+|[，,；;：:\s]+$/g, "")
    .slice(0, 18);
}

function vocalMode(delivery: PlanMusicRequest["vocalDelivery"]) {
  return {
    natural: "自然近讲式主唱，副歌加入轻和声",
    angryRock: "受控沙哑与怒声摇滚唱法，副歌胸声爆发，中文咬字清楚",
    extremeScream: "受控 scream / growl 极限嘶吼，短句重拍，可与清唱交替",
  }[delivery];
}

function fallbackLyrics(
  theme: string,
  delivery: PlanMusicRequest["vocalDelivery"],
  prompt: string,
) {
  if (prompt.includes("歌词写法：对话体")) {
    return [
      "你说 最近是不是太安静",
      "我说 只是有些话没发出去",
      "你问 那我们还算不算靠近",
      "我把正在输入删了又写",
      "最后只回了一句晚安",
      "没说完的话却唱到天亮",
    ];
  }
  if (prompt.includes("歌词写法：现代诗意象")) {
    return [
      "路灯把雨折进后视镜",
      "空座位还留着你的影子",
      "风从没关紧的窗经过",
      "把沉默吹成很远的潮汐",
      "我在天亮以前绕回原地",
      "等一句回声替你靠近",
    ];
  }
  if (prompt.includes("歌词写法：散文感")) {
    return [
      "那天你走得很慢 像在等我开口",
      "我记得街边的灯刚好一盏盏亮起",
      "我们把最重要的话留在普通的告别里",
      "后来每次经过那里 我都会放慢脚步",
      "不是还想回到过去",
      "只是终于学会把想念说清楚",
    ];
  }
  if (prompt.includes("歌词写法：口语叙事")) {
    return [
      "我又绕回我们走过的那条街",
      "手机里那句话还是没有发出去",
      "朋友问我是不是早就没关系",
      "我笑着说只是偶尔会想起",
      "可当熟悉的歌突然响起",
      "我才承认有些告别没有过去",
    ];
  }
  if (prompt.includes("歌词写法：短句钩子")) {
    return [
      "别替沉默认错",
      "别再低头",
      "压住的火 现在开口",
      "我不退后",
      "我不退后",
      "这一回 让全世界听见我怒吼",
    ];
  }
  if (delivery === "angryRock") {
    return [
      `“${theme}” 别再沉默`,
      "压住的火正在胸口翻涌",
      "让失真的琴弦撕开借口",
      "现在听我把真话喊出口",
      "就算整个世界逼我低头",
      "我也要逆着风怒吼",
    ];
  }
  if (delivery === "extremeScream") {
    return [
      theme,
      "别退后",
      "撕开沉默",
      "现在——怒吼",
      "打碎所有借口",
      "不低头 不回头",
    ];
  }
  return [
    theme,
    "人群把没说完的话藏进风里",
    "我把微弱的心跳唱得很轻",
    "等下一束光替我们经过",
  ];
}
