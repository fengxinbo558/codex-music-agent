import type {
  LyricDraftLine,
  LyricWritingStyle,
  LyricVocalDraft,
  VocalDelivery,
  VocalPerformanceCue,
  VocalTechnique,
} from "../types";

const SECTION_SEQUENCE = ["主歌", "主歌", "预副歌", "副歌", "副歌", "桥段", "终副歌", "尾奏"];

export function createLyricVocalDraft(input: {
  lyrics: string[];
  source: "user" | "ai";
  bpm: number;
  targetSeconds: number;
  vocalDelivery: VocalDelivery;
  writingStyle?: LyricWritingStyle;
}): LyricVocalDraft {
  const cleanLyrics = input.lyrics.map((line) => line.trim()).filter(Boolean);
  const lines = cleanLyrics.map<LyricDraftLine>((text, index) => ({
    id: `line-${index + 1}`,
    section: SECTION_SEQUENCE[Math.min(index, SECTION_SEQUENCE.length - 1)],
    text,
    source: input.source,
    warnings: lineWarnings(text, input.bpm, cleanLyrics.length, input.targetSeconds),
  }));
  return {
    id: `lyrics-${Date.now()}`,
    writingStyle: input.writingStyle ?? "conversational",
    lines,
    vocalCues: lines.flatMap((line, index) =>
      recommendedCues(line, index, lines.length, input.vocalDelivery),
    ),
    estimatedSeconds: estimateLyricsDuration(lines, input.bpm),
  };
}

export function updateLyricLine(
  draft: LyricVocalDraft,
  lineId: string,
  text: string,
  bpm: number,
  targetSeconds: number,
): LyricVocalDraft {
  const lines = draft.lines.map((line) =>
    line.id === lineId
      ? {
          ...line,
          text,
          warnings: lineWarnings(text, bpm, draft.lines.length, targetSeconds),
        }
      : line,
  );
  const cues = draft.vocalCues.filter((cue) => {
    if (cue.lyricLineId !== lineId) return true;
    return cue.characterEnd <= text.length;
  });
  return {
    ...draft,
    lines,
    vocalCues: cues,
    estimatedSeconds: estimateLyricsDuration(lines, bpm),
  };
}

export function toggleLineTechnique(
  draft: LyricVocalDraft,
  lineId: string,
  technique: VocalTechnique,
): LyricVocalDraft {
  const line = draft.lines.find((item) => item.id === lineId);
  if (!line) return draft;
  const existing = draft.vocalCues.find(
    (cue) => cue.lyricLineId === lineId && cue.technique === technique,
  );
  if (existing) {
    return {
      ...draft,
      vocalCues: draft.vocalCues.filter((cue) => cue.id !== existing.id),
    };
  }
  const conflicting = techniqueConflicts(technique);
  const retained = draft.vocalCues.filter(
    (cue) =>
      cue.lyricLineId !== lineId || !conflicting.includes(cue.technique),
  );
  return {
    ...draft,
    vocalCues: [
      ...retained,
      {
        id: `${lineId}-${technique}-${Date.now()}`,
        lyricLineId: lineId,
        characterStart: 0,
        characterEnd: line.text.length,
        technique,
        intensity: 2,
        clarity: technique === "diction" ? "emphasized" : "natural",
        source: "user",
      },
    ],
  };
}

export function techniqueConflicts(technique: VocalTechnique): VocalTechnique[] {
  const conflicts: Partial<Record<VocalTechnique, VocalTechnique[]>> = {
    angry: ["breathy", "gentle", "intimate"],
    breathy: ["angry", "shout", "explosive"],
    gentle: ["angry", "shout"],
    shout: ["breathy", "gentle", "intimate"],
    explosive: ["breathy", "restrained"],
    restrained: ["explosive", "shout"],
  };
  return conflicts[technique] ?? [];
}

export function vocalTechniqueLabel(technique: VocalTechnique) {
  const labels: Record<VocalTechnique, string> = {
    angry: "怒音",
    cry: "哭腔",
    shout: "呐喊",
    restrained: "克制",
    gentle: "温柔",
    cold: "冷淡",
    explosive: "爆发",
    breathy: "气声",
    raspy: "沙哑",
    gritty: "颗粒感",
    clear: "清亮",
    thick: "厚实",
    intimate: "贴耳",
    airy: "空灵",
    vibrato: "颤音",
    run: "转音",
    slide: "滑音",
    sustain: "拖腔",
    pause: "停顿",
    spoken: "念白",
    diction: "咬字清楚",
  };
  return labels[technique];
}

function recommendedCues(
  line: LyricDraftLine,
  index: number,
  lineCount: number,
  delivery: VocalDelivery,
): VocalPerformanceCue[] {
  const techniques: VocalTechnique[] = ["diction"];
  if (delivery !== "natural" && /副歌/.test(line.section)) {
    techniques.unshift(delivery === "extremeScream" ? "shout" : "angry");
  } else if (index === 0) {
    techniques.unshift("restrained");
  } else if (index >= lineCount - 2) {
    techniques.unshift("explosive");
  }
  if (index === lineCount - 1) techniques.push("sustain");
  return techniques.slice(0, 3).map((technique, techniqueIndex) => ({
    id: `${line.id}-${technique}`,
    lyricLineId: line.id,
    characterStart: technique === "sustain" ? Math.max(0, line.text.length - 2) : 0,
    characterEnd: line.text.length,
    technique,
    intensity: techniqueIndex === 0 ? 2 : 1,
    clarity: technique === "diction" ? "emphasized" : "natural",
    source: "recommended",
    reason: recommendationReason(technique, line.section),
  }));
}

function lineWarnings(text: string, bpm: number, lineCount: number, targetSeconds: number) {
  const warnings: string[] = [];
  const compactLength = text.replace(/[\s，。！？、,.!?]/g, "").length;
  if (compactLength > 18) warnings.push("这一句偏长，可能咬字拥挤");
  if (compactLength > 14 && bpm >= 125) warnings.push("当前速度较快，建议拆成两句");
  const budget = Math.max(2, targetSeconds / Math.max(1, lineCount));
  if (compactLength / budget > 4.2) warnings.push("目标时长内可能唱不清楚");
  return [...new Set(warnings)];
}

function estimateLyricsDuration(lines: LyricDraftLine[], bpm: number) {
  const characters = lines.reduce(
    (sum, line) => sum + line.text.replace(/\s/g, "").length,
    0,
  );
  const secondsPerCharacter = bpm >= 125 ? 0.27 : bpm >= 95 ? 0.34 : 0.42;
  return Math.round(characters * secondsPerCharacter + lines.length * 1.15);
}

function recommendationReason(technique: VocalTechnique, section: string) {
  if (technique === "diction") return "中文歌词优先听清每个重点词";
  if (technique === "angry" || technique === "shout") return `${section}需要把积压情绪推到前面`;
  if (technique === "restrained") return "开头先留空间，后面才有推进";
  if (technique === "explosive") return "接近情绪峰值，增加前后反差";
  return "尾句延长能让旋律自然收束";
}
