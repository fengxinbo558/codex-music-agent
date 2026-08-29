import { describe, expect, it } from "vitest";

import { createLyricVocalDraft } from "./lyricDraft";
import { buildLyricStorySkeleton, evaluateLyricProfessionalism } from "./lyricProfessionalism";

describe("professional lyric review", () => {
  it("keeps product instructions out of the story skeleton", () => {
    const skeleton = buildLyricStorySkeleton({
      idea: "请把下面内容写成一首歌词。大巴黎本赛季目标是欧冠三连冠。反观里尔阵容明显变薄。只要巴黎今晚发力，里尔主场也挡不住。",
      lines: [],
    });

    expect(skeleton.coreThesis).toContain("欧冠三连冠");
    expect(skeleton.coreThesis).not.toContain("写成一首歌词");
    expect(skeleton.turn).toContain("反观里尔");
    expect(skeleton.conclusion).toContain("挡不住");
  });

  it("rejects abstract filler that loses the source facts", () => {
    const draft = createLyricVocalDraft({
      originalIdea: "巴黎要冲欧冠三连冠，里尔卖掉一亿欧核心，巴黎必须赢下这场比赛。",
      lyrics: ["星光落在梦的远方", "孤独让我勇敢飞翔", "我们追逐最初梦想", "岁月最后都会发光"],
      source: "ai",
      bpm: 120,
      targetSeconds: 60,
      vocalDelivery: "natural",
    });

    expect(draft.professionalReport.canApprove).toBe(false);
    expect(draft.professionalReport.missingFactAnchors).toContain("欧冠");
  });

  it("passes a structured lyric that keeps conflict, facts, and a causal chorus", () => {
    const lyrics = [
      "巴黎瞄准欧冠三连冠",
      "托雷斯首轮梅开二度",
      "里尔卖掉一亿欧核心",
      "阵容变薄还要守住主场",
      "但巴黎不能继续走神",
      "因为五支球队拿到三分",
      "只要巴黎今晚真发力",
      "里尔主场也挡不住",
      "这一声留给巴黎",
      "这里还是七姐聊球",
    ];
    const lines = createLyricVocalDraft({
      originalIdea: "巴黎要冲欧冠三连冠。托雷斯首轮梅开二度。里尔卖掉一亿欧核心。五支球队拿到三分。七姐聊球。",
      lyrics,
      source: "ai",
      bpm: 118,
      targetSeconds: 90,
      vocalDelivery: "angryRock",
    }).lines;

    const report = evaluateLyricProfessionalism({
      idea: "巴黎要冲欧冠三连冠。托雷斯首轮梅开二度。里尔卖掉一亿欧核心。五支球队拿到三分。七姐聊球。",
      lines,
    });
    expect(report.score).toBeGreaterThanOrEqual(65);
    expect(report.canApprove).toBe(true);
  });

  it("rejects a polished lyric that is about a different topic", () => {
    const draft = createLyricVocalDraft({
      originalIdea: "写一首夜里开车听的歌，讲一个人绕回旧街的回忆。",
      lyrics: [
        "巴黎瞄准三连冠",
        "里尔守住主场",
        "但巴黎不能走神",
        "因为对手已经拿分",
        "今晚巴黎必须发力",
        "主场也挡不住",
      ],
      source: "ai",
      bpm: 110,
      targetSeconds: 60,
      vocalDelivery: "natural",
    });
    expect(draft.professionalReport.canApprove).toBe(false);
    expect(draft.professionalReport.dimensions.find((item) => item.id === "thesis")?.pass).toBe(false);
  });
});
