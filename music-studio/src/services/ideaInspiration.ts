export type IdeaInspiration = {
  id: "emotion" | "scene" | "relationship" | "conflict" | "hook";
  label: string;
  title: string;
  suggestion: string;
  reason: string;
};

export function createIdeaInspirations(idea: string): IdeaInspiration[] {
  const cleanIdea = idea.trim();
  const emotional = includesAny(cleanIdea, ["难过", "遗憾", "愤怒", "怒", "治愈", "孤独", "想念", "释怀", "开心", "不甘"]);
  const scene = includesAny(cleanIdea, ["夜", "清晨", "雨", "车", "房间", "街", "海", "天台", "地铁", "电话", "微信"]);
  const relationship = includesAny(cleanIdea, ["你", "我", "他", "她", "我们", "朋友", "爱人", "家人", "自己"]);
  const conflict = includesAny(cleanIdea, ["但是", "却", "没想到", "后来", "离开", "失去", "重逢", "告别", "没说", "来不及"]);
  const hook = /[“”「」\"']/.test(cleanIdea) || includesAny(cleanIdea, ["一句", "喊", "副歌", "钩子"]);

  const items: Array<IdeaInspiration & { missing: boolean }> = [
    {
      id: "emotion",
      label: "情绪核心",
      title: emotional ? "把情绪再说具体一点" : "先决定最想释放什么",
      suggestion: inferEmotion(cleanIdea),
      reason: "情绪越具体，旋律和人声越不容易做成千篇一律。",
      missing: !emotional,
    },
    {
      id: "scene",
      label: "场景镜头",
      title: scene ? "给画面补一个动作" : "给故事一个能看见的地方",
      suggestion: inferScene(cleanIdea),
      reason: "一个时间、地点或动作，能让歌词从口号变成画面。",
      missing: !scene,
    },
    {
      id: "relationship",
      label: "唱给谁",
      title: relationship ? "说清两个人现在的距离" : "决定这首歌是唱给谁",
      suggestion: inferRelationship(cleanIdea),
      reason: "明确对象以后，歌词的人称和说话口气会更自然。",
      missing: !relationship,
    },
    {
      id: "conflict",
      label: "故事转折",
      title: conflict ? "把转折推到副歌" : "补一句“可是后来”",
      suggestion: inferConflict(cleanIdea),
      reason: "没有变化的情绪很难撑起一整首歌，转折会形成主歌与副歌。",
      missing: !conflict,
    },
    {
      id: "hook",
      label: "记忆金句",
      title: hook ? "让这句话在副歌重复" : "先写一句最想让人记住的话",
      suggestion: inferHook(cleanIdea),
      reason: "一句短、直接、能复唱的话，最容易成为副歌钩子。",
      missing: !hook,
    },
  ];

  return items
    .sort(
      (left, right) =>
        Number(right.missing) - Number(left.missing) ||
        inspirationPriority(right.id) - inspirationPriority(left.id),
    )
    .slice(0, 4)
    .map(({ missing: _missing, ...item }) => item);
}

function inspirationPriority(id: IdeaInspiration["id"]) {
  return { hook: 5, scene: 4, relationship: 3, emotion: 2, conflict: 1 }[id];
}

export function appendIdeaInspiration(idea: string, suggestion: string) {
  const cleanIdea = idea.trim().replace(/[；;。,.，\s]+$/, "");
  const cleanSuggestion = suggestion.trim();
  if (!cleanIdea) return cleanSuggestion;
  if (!cleanSuggestion || cleanIdea.includes(cleanSuggestion)) return cleanIdea;
  return `${cleanIdea}；${cleanSuggestion}`;
}

function inferEmotion(idea: string) {
  if (includesAny(idea, ["摇滚", "怒", "嘶吼", "爆发"])) return "情绪从压着不说，推进到不甘和爆发";
  if (includesAny(idea, ["治愈", "温暖", "希望"])) return "情绪从疲惫和迟疑，慢慢走向被理解";
  if (includesAny(idea, ["夜", "雨", "孤独", "想念"])) return "情绪是想靠近又不敢打扰的克制想念";
  return "情绪从克制开始，到副歌才真正说出口";
}

function inferScene(idea: string) {
  if (includesAny(idea, ["车", "开车"])) return "场景是凌晨开车经过空荡高架，红灯时想起那个人";
  if (includesAny(idea, ["聊天", "微信", "对话"])) return "场景是深夜聊天框里，删了又写、始终没发出的那句话";
  if (includesAny(idea, ["海", "夏天"])) return "场景是夏夜海边，风把最后一句话吹得听不清";
  return "场景是雨停后的深夜街口，一个人边走边回想";
}

function inferRelationship(idea: string) {
  if (includesAny(idea, ["自己", "成长", "迷茫"])) return "唱给那个总说没关系、其实已经很累的自己";
  if (includesAny(idea, ["朋友", "兄弟", "姐妹"])) return "唱给很久没联系、见面却仍然熟悉的朋友";
  return "唱给一个已经走远、却还有一句话没说完的人";
}

function inferConflict(idea: string) {
  if (includesAny(idea, ["怒", "摇滚", "嘶吼"])) return "主歌一直忍着，直到副歌承认：我不是放下，只是不再解释";
  if (includesAny(idea, ["治愈", "温暖"])) return "原以为只能独自撑住，后来发现有人一直留着灯";
  return "以为时间会让一切过去，可一个熟悉的声音又把记忆叫醒";
}

function inferHook(idea: string) {
  if (includesAny(idea, ["怒", "摇滚", "嘶吼"])) return "副歌钩子：“这一次，我不再替沉默认错”";
  if (includesAny(idea, ["治愈", "温暖"])) return "副歌钩子：“慢一点也没关系，天总会亮”";
  return "副歌钩子：“没说完的话，还在夜里回响”";
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
