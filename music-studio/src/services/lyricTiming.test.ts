import { describe, expect, it } from "vitest";

import { activeLyricCueIndex, createEstimatedLyricCues } from "./lyricTiming";

describe("lyric timing", () => {
  it("turns lyric lines into ordered cues and ignores section labels", () => {
    const cues = createEstimatedLyricCues(
      ["[主歌]", "雨落在窗前", "我还没睡", "", "[副歌]", "天会亮"],
      60,
    );

    expect(cues.map((cue) => cue.text)).toEqual([
      "雨落在窗前",
      "我还没睡",
      "天会亮",
    ]);
    expect(cues[0].start).toBeGreaterThan(0);
    expect(cues[1].start).toBe(cues[0].end);
    expect(cues.at(-1)?.end).toBeLessThanOrEqual(60);
    expect(cues.every((cue) => cue.source === "estimated")).toBe(true);
  });

  it("gives longer or punctuated lines more time", () => {
    const cues = createEstimatedLyricCues(
      ["短句", "这一句更长，而且中间还有一次停顿。"],
      30,
    );

    expect(cues[1].end - cues[1].start).toBeGreaterThan(
      cues[0].end - cues[0].start,
    );
  });

  it("finds the current cue and safely handles the intro and outro", () => {
    const cues = createEstimatedLyricCues(["第一句", "第二句"], 20);

    expect(activeLyricCueIndex(cues, 0)).toBe(0);
    expect(activeLyricCueIndex(cues, cues[1].start + 0.1)).toBe(1);
    expect(activeLyricCueIndex(cues, 99)).toBe(1);
    expect(activeLyricCueIndex([], 4)).toBe(-1);
  });
});
