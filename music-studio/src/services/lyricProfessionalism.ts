import type {
  LyricDraftLine,
  LyricProfessionalReport,
  LyricQualityDimension,
  LyricQualityDimensionId,
  LyricStorySkeleton,
} from "../types";
import { verbalizeNumbers } from "./lyricCompiler";

const STOP_WORDS = new Set([
  "这个",
  "那个",
  "就是",
  "然后",
  "因为",
  "所以",
  "已经",
  "可以",
  "一个",
  "一些",
  "还是",
  "没有",
  "自己",
  "我们",
  "他们",
  "什么",
  "怎么",
  "今天",
  "今晚",
  "最近",
  "另外",
  "以上",
]);

const CLICHES = [
  "人海茫茫",
  "星辰大海",
  "时光荏苒",
  "岁月如歌",
  "永不放弃",
  "勇敢飞翔",
  "破茧成蝶",
  "孤独的夜",
  "最初的梦想",
];

const CAUSAL_WORDS = ["因为", "所以", "却", "但", "可是", "于是", "只要", "哪怕", "不再"];
const RELATION_WORDS = ["我", "你", "他", "她", "我们", "你们", "他们", "对手", "主场", "客场"];

export function buildLyricStorySkeleton(input: {
  idea: string;
  lines: LyricDraftLine[];
}): LyricStorySkeleton {
  const sourceSentences = splitSentences(input.idea);
  const lyricSentences = input.lines.map((line) => line.text.trim()).filter(Boolean);
  const all = sourceSentences.length ? sourceSentences : lyricSentences;
  const content = all.filter((sentence) => !isPlanningInstruction(sentence));
  const story = content.length ? content : all;
  const thesis = story.find((sentence) => /目标|想要|必须|只要|核心|观点/.test(sentence)) ?? story[0];
  const turn = story.find((sentence) => /反观|但|却|可是|不过|虽然/.test(sentence));
  const conclusion = [...story].reverse().find((sentence) => /所以|只要|必须|观点|挡不住|赢|输/.test(sentence)) ?? story.at(-1);

  return {
    speaker: detectSpeaker(input.idea, lyricSentences),
    addressee: detectAddressee(input.idea, lyricSentences),
    coreThesis: thesis?.slice(0, 48) || "还没有形成明确主题",
    facts: extractFactAnchors(input.idea || lyricSentences.join("。")),
    turn: (turn ?? story[Math.floor(story.length / 2)])?.slice(0, 48) || "还没有明显转折",
    conclusion: conclusion?.slice(0, 48) || "还没有落到明确结论",
  };
}

export function evaluateLyricProfessionalism(input: {
  idea: string;
  lines: LyricDraftLine[];
}): LyricProfessionalReport {
  const lyricText = input.lines.map((line) => line.text.trim()).filter(Boolean).join("\n");
  const compact = normalize(lyricText);
  const source = input.idea.trim() || lyricText;
  const sourceTopics = extractTopicKeywords(input.idea);
  const lyricTopics = extractTopicKeywords(lyricText);
  const rawTopicOverlap = sourceTopics.length
    ? sourceTopics.filter((topic) => lyricTopics.some((item) => item.includes(topic) || topic.includes(item))).length / sourceTopics.length
    : 1;
  const factAnchors = extractFactAnchors(source);
  const coveredFactAnchors = factAnchors.filter((anchor) => compact.includes(normalize(anchor)));
  const missingFactAnchors = factAnchors.filter((anchor) => !coveredFactAnchors.includes(anchor));
  const factRatio = factAnchors.length ? coveredFactAnchors.length / factAnchors.length : 1;
  const topicOverlap = Math.max(
    rawTopicOverlap,
    factAnchors.length >= 2
      ? coveredFactAnchors.length >= Math.min(4, factAnchors.length)
        ? 0.6
        : coveredFactAnchors.length >= 2
          ? 0.3
          : 0
      : 0,
  );
  const nonempty = input.lines.filter((line) => normalize(line.text).length > 0);
  const lengths = nonempty.map((line) => normalize(line.text).length);
  const singableRatio = lengths.length
    ? lengths.filter((length) => length >= 4 && length <= 14).length / lengths.length
    : 0;
  const uniqueRatio = nonempty.length
    ? new Set(nonempty.map((line) => normalize(line.text))).size / nonempty.length
    : 0;
  const sections = new Set(nonempty.map((line) => line.section));
  const chorusLines = nonempty.filter((line) => /副歌/.test(line.section));
  const hasCausality = CAUSAL_WORDS.some((word) => lyricText.includes(word));
  const relationshipSignals = RELATION_WORDS.filter((word) => lyricText.includes(word)).length;
  const motif = strongestRepeatedAnchor(nonempty.map((line) => line.text));
  const clicheHits = CLICHES.filter((phrase) => lyricText.includes(phrase));

  const thesisScore = compact.length < 8
    ? 3
    : topicOverlap >= 0.5
      ? 15
      : topicOverlap >= 0.25
        ? 9
        : 3;
  const dimensions: LyricQualityDimension[] = [
    dimension("thesis", "核心主题", thesisScore, 15,
      topicOverlap >= 0.5
        ? "歌词与用户原始创意保持同一个中心主题。"
        : `原始创意中的“${sourceTopics.join("、") || "中心内容"}”没有在歌词里得到足够回应。`),
    dimension("relationship", "人物关系", relationshipSignals >= 2 ? 10 : relationshipSignals === 1 ? 6 : 2, 10,
      relationshipSignals >= 2 ? "说话者、对象或对手关系能够被听懂。" : "缺少“谁在对谁说”的关系线索。"),
    dimension("facts", "关键事实", Math.round(20 * factRatio), 20,
      factAnchors.length ? `保留 ${coveredFactAnchors.length}/${factAnchors.length} 个关键事实锚点。` : "原始创意没有需要锁定的事实锚点。"),
    dimension("progression", "段落推进", sections.size >= 4 && uniqueRatio >= 0.8 ? 15 : sections.size >= 3 ? 10 : 5, 15,
      sections.size >= 4 ? "主歌、转折与副歌承担了不同任务。" : "段落功能还不够分明，容易从头到尾说同一件事。"),
    dimension("motif", "意象一致", motif ? 10 : nonempty.length >= 4 ? 6 : 3, 10,
      motif ? `“${motif}”形成了贯穿线索。` : "没有发现稳定重复的核心意象或关键词。"),
    dimension("chorus", "副歌因果", chorusLines.length >= 2 && hasCausality ? 10 : chorusLines.length ? 6 : 2, 10,
      chorusLines.length >= 2 && hasCausality ? "副歌既有记忆点，也承接了前文冲突。" : "副歌需要回应主歌里的原因或冲突，而不只是喊口号。"),
    dimension("singability", "可演唱性", Math.round(15 * singableRatio), 15,
      `${Math.round(singableRatio * 100)}% 的句子处于 4–14 字的清晰演唱区间。`),
    dimension("cliche", "套话风险", clicheHits.length === 0 ? 5 : Math.max(0, 5 - clicheHits.length * 2), 5,
      clicheHits.length ? `发现套话：${clicheHits.join("、")}。` : "未发现高频空泛套话。"),
  ];
  const score = dimensions.reduce((sum, item) => sum + item.score, 0);
  const warnings = [
    ...(factRatio < 0.5 && factAnchors.length >= 2 ? ["关键事实丢失过多，不能确认进入生成。"] : []),
    ...(singableRatio < 0.6 ? ["长句或碎句过多，当前版本容易唱糊。"] : []),
    ...(chorusLines.length === 0 ? ["还没有明确副歌，歌曲缺少可记忆的落点。"] : []),
  ];

  return {
    score,
    canApprove: score >= 65 && thesisScore >= 9 && factRatio >= 0.5 && singableRatio >= 0.6 && chorusLines.length > 0,
    dimensions,
    factAnchors,
    coveredFactAnchors,
    missingFactAnchors,
    warnings,
  };
}

export function extractFactAnchors(text: string): string[] {
  if (!text.trim()) return [];
  const anchors: string[] = [];
  const numeric = text.match(/\d+(?:\.\d+)?(?:亿欧|亿|万|年|支|场|球|个|次|届|%|[-比:]\d+)?/g) ?? [];
  anchors.push(...numeric);
  const domainTerms = [
    "欧冠",
    "法甲",
    "德甲",
    "中超",
    "主场",
    "客场",
    "三连冠",
    "十字韧带",
    "转会",
  ];
  anchors.push(...domainTerms.filter((term) => text.includes(term)));

  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
  const words = [...segmenter.segment(text)]
    .filter((item) => item.isWordLike)
    .map((item) => item.segment.trim())
    .filter((word) => /^[\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z\d-]*$/u.test(word))
    .filter((word) => word.length >= 2 && word.length <= 10)
    .filter((word) => !STOP_WORDS.has(word));
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  const named = [...counts]
    .filter(([word, count]) => count >= 2 || /[A-Za-z]|欧冠|法甲|德甲|中超|主场|客场|核心|冠军|韧带|转会/.test(word))
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 8)
    .map(([word]) => word);
  anchors.push(...named);
  return [...new Set(anchors)].slice(0, 12);
}

function dimension(
  id: LyricQualityDimensionId,
  label: string,
  score: number,
  maxScore: number,
  explanation: string,
): LyricQualityDimension {
  return { id, label, score, maxScore, pass: score / maxScore >= 0.6, explanation };
}

function splitSentences(text: string) {
  return text.split(/[。！？!?\n]+/).map((item) => item.trim()).filter(Boolean);
}

function isPlanningInstruction(sentence: string) {
  return /^(?:请|帮我|我想|需要|生成|写|制作|改成|保留|不要|长度|曲风|唱法|参考)/.test(sentence)
    && /歌词|歌曲|音乐|主歌|副歌|曲风|唱法|创意|内容|生成|制作|改/.test(sentence);
}

function normalize(text: string) {
  return verbalizeNumbers(text)
    .replace(/(?<=[零一二三四五六七八九])比(?=[零一二三四五六七八九])/g, "")
    .replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()《》【】\[\]-]/g, "");
}

function detectSpeaker(idea: string, lines: string[]) {
  const text = `${idea}\n${lines.join("\n")}`;
  const signature = text.match(/([\p{Script=Han}A-Za-z\d]{2,12}(?:聊球|说球|音乐|日记|手记))/u)?.[1];
  if (signature) return signature;
  if (/我|咱们/.test(text)) return "第一人称讲述者";
  return "待确认的讲述者";
}

function detectAddressee(idea: string, lines: string[]) {
  const text = `${idea}\n${lines.join("\n")}`;
  if (/大家|你们/.test(text)) return "正在听歌的人";
  if (/你/.test(text)) return "歌词中的“你”";
  if (/对阵|对手|主场|客场/.test(text)) return "被讲述的双方与观众";
  return "待确认的对象";
}

function strongestRepeatedAnchor(lines: string[]) {
  const text = lines.join("\n");
  return extractFactAnchors(text).find((anchor) => lines.filter((line) => line.includes(anchor)).length >= 2) ?? "";
}

function extractTopicKeywords(text: string) {
  if (!text.trim()) return [];
  const planningWords = new Set([
    "一首",
    "歌词",
    "音乐",
    "中文",
    "主歌",
    "副歌",
    "曲风",
    "清楚",
    "生成",
    "写一首",
    "制作",
    "摇滚",
    "民谣",
    "流行",
  ]);
  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
  return [...new Set(
    [...segmenter.segment(text)]
      .filter((item) => item.isWordLike)
      .map((item) => item.segment.trim())
      .filter((word) => word.length >= 2 && word.length <= 10)
      .filter((word) => !STOP_WORDS.has(word) && !planningWords.has(word)),
  )].slice(0, 8);
}
