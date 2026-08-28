import type { LyricCue } from "../types";

const SECTION_TAG = /^\s*\[[^\]]+\]\s*$/;

export function createEstimatedLyricCues(
  lyrics: string[],
  durationSeconds: number,
): LyricCue[] {
  const lines = lyrics
    .map((line) => line.trim())
    .filter((line) => line && !SECTION_TAG.test(line));
  if (
    !lines.length ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  )
    return [];

  const leadIn = Math.min(6, Math.max(1.5, durationSeconds * 0.08));
  const tail = Math.min(4, Math.max(1, durationSeconds * 0.05));
  const usableDuration = Math.max(
    lines.length * 0.45,
    durationSeconds - leadIn - tail,
  );
  const weights = lines.map(lineTimingWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.min(leadIn, Math.max(0, durationSeconds - 0.5));

  return lines.map((line, index) => {
    const remaining = Math.max(0.35, durationSeconds - cursor);
    const allocation = Math.max(
      0.45,
      (usableDuration * weights[index]) / totalWeight,
    );
    const end =
      index === lines.length - 1
        ? Math.max(cursor + 0.35, durationSeconds - tail)
        : cursor + Math.min(allocation, remaining);
    const cue: LyricCue = {
      id: `estimated-${index + 1}`,
      text: line,
      start: roundTime(cursor),
      end: roundTime(Math.min(durationSeconds, end)),
      source: "estimated",
    };
    cursor = cue.end;
    return cue;
  });
}

export function activeLyricCueIndex(cues: LyricCue[], currentTime: number) {
  if (!cues.length) return -1;
  const exact = cues.findIndex(
    (cue) => currentTime >= cue.start && currentTime < cue.end,
  );
  if (exact >= 0) return exact;
  if (currentTime < cues[0].start) return 0;
  return cues.length - 1;
}

function lineTimingWeight(line: string) {
  const characters = line.replace(/\s/g, "").length;
  const punctuationPauses = (line.match(/[，。！？；、,.!?;]/g) ?? []).length;
  return Math.max(2, characters + punctuationPauses * 1.8);
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}
