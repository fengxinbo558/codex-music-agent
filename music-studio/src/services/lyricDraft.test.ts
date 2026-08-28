import { describe, expect, it } from "vitest";

import {
  createLyricVocalDraft,
  techniqueConflicts,
  toggleLineTechnique,
  updateLyricLine,
} from "./lyricDraft";

describe("lyric and vocal draft", () => {
  it("keeps user text and flags lines that are hard to sing clearly", () => {
    const original = "这是一句特别特别长而且需要在很短时间内全部唱清楚的中文歌词";
    const draft = createLyricVocalDraft({
      lyrics: [original, "短句"],
      source: "user",
      bpm: 138,
      targetSeconds: 30,
      vocalDelivery: "natural",
    });
    expect(draft.lines[0].text).toBe(original);
    expect(draft.lines[0].source).toBe("user");
    expect(draft.lines[0].warnings.length).toBeGreaterThan(0);
  });

  it("removes cues whose character range becomes invalid after editing", () => {
    const draft = createLyricVocalDraft({
      lyrics: ["这一句结尾需要拖长"],
      source: "ai",
      bpm: 90,
      targetSeconds: 30,
      vocalDelivery: "natural",
    });
    const updated = updateLyricLine(draft, "line-1", "短句", 90, 30);
    expect(
      updated.vocalCues.every((cue) => cue.characterEnd <= 2),
    ).toBe(true);
  });

  it("prevents incompatible primary techniques on the same line", () => {
    let draft = createLyricVocalDraft({
      lyrics: ["现在听我怒吼"],
      source: "user",
      bpm: 132,
      targetSeconds: 30,
      vocalDelivery: "natural",
    });
    draft = toggleLineTechnique(draft, "line-1", "breathy");
    draft = toggleLineTechnique(draft, "line-1", "angry");
    const techniques = draft.vocalCues
      .filter((cue) => cue.lyricLineId === "line-1")
      .map((cue) => cue.technique);
    expect(techniques).toContain("angry");
    expect(techniques).not.toContain("breathy");
    expect(techniqueConflicts("angry")).toContain("breathy");
  });
});
