import { describe, expect, it } from "vitest";

import { DEFAULT_GENERATION_PREFERENCES } from "../data/generationPreferences";
import type { AgentPlanResponse } from "../types";
import { createDirectionRecommendations } from "./directionRecommendations";

const plan: AgentPlanResponse = {
  source: "local",
  brief: {
    title: "未寄出的回声",
    summary: "一首关于未说出口的话的歌",
    genre: "Indie Pop",
    mood: "亲密、内省",
    bpm: 112,
    key: "C major",
    language: "中文",
    vocalMode: "自然女声",
    instruments: ["木吉他", "软鼓组", "暖色贝斯", "氛围合成器"],
    structure: ["前奏", "主歌", "副歌"],
    lyrics: ["第一句", "第二句"],
    preserve: ["保留主题"],
    change: ["建立完整结构"],
    provider: "ACE-Step",
    costLabel: "本地",
  },
};

describe("direction recommendations", () => {
  it("returns three complete and meaningfully different directions", () => {
    const directions = createDirectionRecommendations(
      plan,
      DEFAULT_GENERATION_PREFERENCES,
    );

    expect(directions.map((item) => item.kind)).toEqual([
      "recommended",
      "safe",
      "bold",
    ]);
    expect(new Set(directions.map((item) => item.brief.bpm)).size).toBe(3);
    expect(new Set(directions.map((item) => item.brief.structure.join("/"))).size).toBe(3);
    directions.forEach((direction) => {
      expect(direction.reason).not.toBe("");
      expect(direction.voiceTexture).not.toBe("");
      expect(direction.brief.instruments.length).toBeGreaterThanOrEqual(3);
      expect(direction.brief.bpm).toBeGreaterThanOrEqual(68);
      expect(direction.brief.bpm).toBeLessThanOrEqual(168);
    });
  });

  it("does not mutate the source plan", () => {
    const before = structuredClone(plan);
    createDirectionRecommendations(plan, DEFAULT_GENERATION_PREFERENCES);
    expect(plan).toEqual(before);
  });

  it("caps the clear-lyric safe direction so Mandarin has room to articulate", () => {
    const fastPlan = {
      ...plan,
      brief: { ...plan.brief, bpm: 148 },
    };
    const directions = createDirectionRecommendations(
      fastPlan,
      { ...DEFAULT_GENERATION_PREFERENCES, lyricClarity: "clear" },
    );
    expect(directions.find((item) => item.kind === "safe")?.brief.bpm).toBe(108);
  });
});
