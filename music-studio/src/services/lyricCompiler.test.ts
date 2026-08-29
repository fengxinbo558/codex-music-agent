import { describe, expect, it } from "vitest";

import { createLyricVocalDraft, toggleLineTechnique } from "./lyricDraft";
import {
  compileLyricSegments,
  compileLyricsForMusicModel,
  selectCoreSampleDraft,
  splitSingableLine,
} from "./lyricCompiler";

describe("music model lyric compiler", () => {
  it("splits long Chinese text without changing its words or order", () => {
    const source = "大巴黎今夜必须振作起来，只要真正发力里尔主场也挡不住。";
    const parts = splitSingableLine(source, 10);
    const normalize = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, "");

    expect(parts.every((line) => normalize(line).length <= 10)).toBe(true);
    expect(normalize(parts.join(""))).toBe(normalize(source));
  });

  it("adds ACE-Step section tags and recommends a viable duration", () => {
    const draft = createLyricVocalDraft({
      lyrics: Array.from({ length: 24 }, (_, index) => `这是需要唱清楚的第${index + 1}句歌词`),
      source: "user",
      bpm: 110,
      targetSeconds: 30,
      vocalDelivery: "natural",
    });
    const compiled = compileLyricsForMusicModel(draft, 30);

    expect(compiled.taggedLyrics).toContain("[Verse");
    expect(compiled.taggedLyrics).toContain("[Chorus");
    expect(compiled.suggestedDuration).toBeGreaterThanOrEqual(90);
  });

  it("uses only the approved emotional core for a 30 second sample", () => {
    const draft = createLyricVocalDraft({
      lyrics: Array.from({ length: 20 }, (_, index) => `第${index + 1}句体育评论歌词`),
      source: "ai",
      bpm: 118,
      targetSeconds: 120,
      vocalDelivery: "angryRock",
    });
    const sample = selectCoreSampleDraft(draft);
    expect(sample.lines.length).toBeGreaterThanOrEqual(3);
    expect(sample.lines.length).toBeLessThanOrEqual(4);
    expect(sample.lines.some((line) => /副歌/.test(line.section))).toBe(true);
  });

  it("prioritizes a causal hook and conclusion for the core sample", () => {
    const draft = createLyricVocalDraft({
      lyrics: [
        "巴黎瞄准欧冠三连冠",
        "托雷斯首轮梅开二度",
        "里尔卖掉一亿欧核心",
        "阵容正在变薄",
        "虽然巴黎被雷恩逼平",
        "今晚不能继续走神",
        "因为五支球队拿到三分",
        "巴黎已经没有退路",
        "只要巴黎今晚真发力",
        "里尔主场也挡不住",
        "这一声把借口都吼碎",
        "这里还是七姐聊球",
      ],
      source: "ai",
      bpm: 110,
      targetSeconds: 120,
      vocalDelivery: "angryRock",
    });
    const sample = selectCoreSampleDraft(draft);
    const text = sample.lines.map((line) => line.text).join("\n");
    expect(text).toContain("因为五支球队拿到三分");
    expect(text).toContain("只要巴黎今晚真发力");
    expect(sample.lines.length).toBe(4);
  });

  it("turns user-selected line techniques into real model performance tags", () => {
    const original = createLyricVocalDraft({
      lyrics: ["这一句尾音要颤起来", "下一句保持清楚"],
      source: "user",
      bpm: 96,
      targetSeconds: 30,
      vocalDelivery: "natural",
    });
    const edited = toggleLineTechnique(
      original,
      original.lines[0].id,
      "vibrato",
    );
    const compiled = compileLyricsForMusicModel(edited, 30);
    expect(compiled.taggedLyrics).toContain("[Verse - vibrato");
    expect(compiled.taggedLyrics).toContain("这一句尾音要颤起来");
  });

  it("writes scores and amounts as words so the model sings them clearly", () => {
    expect(splitSingableLine("里尔客场2-0零封昂热")).toEqual([
      "里尔客场二比零零封昂热",
    ]);
    expect(splitSingableLine("卖掉1亿欧核心")).toEqual(["卖掉一亿欧核心"]);
    expect(splitSingableLine("已有5支球队拿三分")).toEqual([
      "已有五支球队拿三分",
    ]);
    expect(splitSingableLine("已有10支球队拿分")).toEqual([
      "已有十支球队拿分",
    ]);
  });

  it("balances thirteen lines without leaving a one-line final segment", () => {
    const draft = createLyricVocalDraft({
      lyrics: Array.from({ length: 13 }, (_, index) => `第${index + 1}句歌词`),
      source: "user",
      bpm: 104,
      targetSeconds: 120,
      vocalDelivery: "natural",
    });
    const segments = compileLyricSegments(draft, 4);

    expect(segments.map((segment) => segment.approvedLyrics.length)).toEqual([
      4, 3, 3, 3,
    ]);
    expect(segments.flatMap((segment) => segment.approvedLyrics)).toHaveLength(
      13,
    );
  });
});
