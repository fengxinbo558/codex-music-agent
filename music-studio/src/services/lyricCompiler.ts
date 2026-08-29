import type {
  GenerationDuration,
  LyricVocalDraft,
  VocalTechnique,
} from "../types";

const SECTION_TAGS: Array<[RegExp, string]> = [
  [/前奏|intro/i, "[Intro]"],
  [/预副歌|pre/i, "[Pre-Chorus]"],
  [/终副歌|副歌|chorus/i, "[Chorus]"],
  [/桥段|bridge/i, "[Bridge]"],
  [/尾奏|尾声|outro/i, "[Outro]"],
  [/主歌|verse/i, "[Verse]"],
];

export type CompiledLyrics = {
  taggedLyrics: string;
  lines: string[];
  suggestedDuration: GenerationDuration;
  characterCount: number;
};

export type CompiledLyricSegment = {
  modelLyrics: string[];
  approvedLyrics: string[];
  keyTerms: string[];
};

export function compileLyricsForMusicModel(
  draft: LyricVocalDraft,
  requestedDuration: GenerationDuration,
): CompiledLyrics {
  const output: string[] = [];
  const plainLines: string[] = [];
  let activeTag = "";
  for (const line of draft.lines) {
    const tag = decoratedSectionTag(
      sectionTag(line.section),
      draft.vocalCues
        .filter((cue) => cue.lyricLineId === line.id)
        .sort((left, right) =>
          left.source === right.source ? 0 : left.source === "user" ? -1 : 1,
        )
        .map((cue) => cue.technique),
    );
    if (tag !== activeTag) {
      output.push(tag);
      activeTag = tag;
    }
    const parts = splitSingableLine(line.text);
    output.push(...parts);
    plainLines.push(...parts);
  }
  const characterCount = plainLines.reduce((sum, line) => sum + normalize(line).length, 0);
  return {
    taggedLyrics: output.join("\n"),
    lines: plainLines,
    suggestedDuration: suggestDuration(characterCount, requestedDuration),
    characterCount,
  };
}

export function selectCoreSampleDraft(draft: LyricVocalDraft): LyricVocalDraft {
  const candidates = draft.lines.filter((line) => /预副歌|副歌|桥段/.test(line.section));
  const ranked = candidates
    .map((line) => ({ line, index: draft.lines.indexOf(line), score: coreLineScore(line.text) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 4)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.line);
  const selected = ranked.length >= 3 ? ranked : draft.lines.slice(0, 4);
  return {
    ...draft,
    lines: selected,
  };
}

export function compileLyricSegments(
  draft: LyricVocalDraft,
  maxSourceLines = 4,
): CompiledLyricSegment[] {
  const lines = draft.lines.filter((line) => line.text.trim());
  if (!lines.length) return [];
  const groupCount = Math.ceil(lines.length / Math.max(1, maxSourceLines));
  const baseSize = Math.floor(lines.length / groupCount);
  const remainder = lines.length % groupCount;
  const groups: typeof lines[] = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    groups.push(lines.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups.map((group) => {
    const compiled = compileLyricsForMusicModel(
      { ...draft, lines: group },
      30,
    );
    const searchable = normalize(compiled.lines.join(""));
    return {
      modelLyrics: compiled.taggedLyrics.split("\n"),
      approvedLyrics: compiled.lines,
      keyTerms: draft.professionalReport.factAnchors.filter((anchor) =>
        searchable.includes(normalize(anchor)),
      ),
    };
  });
}

export function splitSingableLine(text: string, maxCharacters = 12): string[] {
  const clean = verbalizeNumbers(
    text.trim().replace(/^\[[^\]]+\]\s*/, ""),
  );
  if (!clean) return [];
  const phrases = clean
    .split(/(?<=[，。！？、；：,.!?;:])/)
    .map((part) => part.replace(/[，。！？、；：,.!?;:]+$/g, "").trim())
    .filter(Boolean);
  const output: string[] = [];
  for (const phrase of phrases.length ? phrases : [clean]) {
    let remaining = phrase;
    while (normalize(remaining).length > maxCharacters) {
      const splitAt = findSafeSplit(remaining, maxCharacters);
      output.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) output.push(remaining);
  }
  return output;
}

function sectionTag(section: string) {
  return SECTION_TAGS.find(([pattern]) => pattern.test(section))?.[1] ?? "[Verse]";
}

function decoratedSectionTag(tag: string, techniques: VocalTechnique[]) {
  const instructions = [...new Set(techniques.map(modelTechnique))]
    .filter(Boolean)
    .slice(0, 2);
  return instructions.length
    ? tag.replace("]", ` - ${instructions.join(", ")}]`)
    : tag;
}

function modelTechnique(technique: VocalTechnique) {
  const labels: Record<VocalTechnique, string> = {
    angry: "controlled rasp",
    cry: "crying tone",
    shout: "shouted",
    restrained: "restrained",
    gentle: "gentle",
    cold: "cold tone",
    explosive: "explosive",
    breathy: "breathy",
    raspy: "raspy",
    gritty: "gritty",
    clear: "clear tone",
    thick: "full-bodied",
    intimate: "intimate",
    airy: "airy",
    vibrato: "vibrato",
    run: "short vocal run",
    slide: "pitch slide",
    sustain: "sustained ending",
    pause: "dramatic pause",
    spoken: "spoken",
    diction: "clear diction",
  };
  return labels[technique];
}

function suggestDuration(characterCount: number, requested: GenerationDuration): GenerationDuration {
  const needed = characterCount > 440 ? 240 : characterCount > 320 ? 180 : characterCount > 210 ? 120 : characterCount > 135 ? 90 : characterCount > 70 ? 60 : 30;
  return Math.max(needed, requested) as GenerationDuration;
}

function findSafeSplit(text: string, maxCharacters: number) {
  let normalizedCount = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (normalize(text[index]).length) normalizedCount += 1;
    if (normalizedCount >= maxCharacters) return index + 1;
  }
  return text.length;
}

function normalize(text: string) {
  return text.replace(/[^\p{L}\p{N}]/gu, "");
}

export function verbalizeNumbers(text: string) {
  const digits = "零一二三四五六七八九";
  return text
    .replace(/(\d+)\.(\d+)/g, (_, whole: string, decimal: string) =>
      `${[...whole].map((digit) => digits[Number(digit)]).join("")}点${[...decimal]
        .map((digit) => digits[Number(digit)])
        .join("")}`,
    )
    .replace(/(\d+)\s*[-:：比]\s*(\d+)/g, (_, left: string, right: string) =>
      `${[...left].map((digit) => digits[Number(digit)]).join("")}比${[...right]
        .map((digit) => digits[Number(digit)])
        .join("")}`,
    )
    .replace(/\d+/g, (value) => chineseInteger(value, digits));
}

function chineseInteger(value: string, digits: string) {
  if (value.length > 4) {
    return [...value].map((digit) => digits[Number(digit)]).join("");
  }
  const units = ["", "十", "百", "千"];
  let output = "";
  let pendingZero = false;
  [...value].forEach((digit, index) => {
    const number = Number(digit);
    const unitIndex = value.length - index - 1;
    if (number === 0) {
      pendingZero = Boolean(output) && index < value.length - 1;
      return;
    }
    if (pendingZero) output += "零";
    if (!(number === 1 && unitIndex === 1 && output === "")) {
      output += digits[number];
    }
    output += units[unitIndex];
    pendingZero = false;
  });
  return output || "零";
}

function coreLineScore(text: string) {
  let score = Math.max(0, 12 - normalize(text).length) * 0.08;
  if (/只要|必须|挡不住|没有退路|不再|不能/.test(text)) score += 4;
  if (/因为|所以|虽然|但|却|于是/.test(text)) score += 3;
  if (/今晚|现在|这一刻|终于/.test(text)) score += 1;
  return score;
}
