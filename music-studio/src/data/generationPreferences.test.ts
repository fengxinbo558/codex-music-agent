import { describe, expect, it } from "vitest";

import {
  DEFAULT_GENERATION_PREFERENCES,
  getContentFitNotice,
  normalizeGenerationPreferences,
  summarizePreferences,
} from "./generationPreferences";

describe("generation preferences", () => {
  it("migrates older stored settings to natural delivery", () => {
    const preferences = normalizeGenerationPreferences({
      duration: 60,
      vocalStyle: "male",
      lyricsMode: "current",
      creativity: "stable",
      variantCount: 1,
      toneProfile: "warm",
    });

    expect(preferences.vocalDelivery).toBe("natural");
    expect(summarizePreferences(preferences)).toContain("自然演唱");
  });

  it("shows the selected aggressive delivery in the compact summary", () => {
    const preferences = {
      ...DEFAULT_GENERATION_PREFERENCES,
      vocalStyle: "male" as const,
      vocalDelivery: "angryRock" as const,
    };

    expect(summarizePreferences(preferences)).toContain("男声 · 怒声摇滚");
  });

  it("warns when long prose cannot fit the selected duration", () => {
    expect(getContentFitNotice(DEFAULT_GENERATION_PREFERENCES, 420, 0)).toBe(
      "这段文案较长，AI 会提炼成歌词，不会逐字唱完。建议改成 90 秒。",
    );
  });

  it("uses current lyric length and does not warn for instrumental music", () => {
    const currentLyrics = {
      ...DEFAULT_GENERATION_PREFERENCES,
      lyricsMode: "current" as const,
    };
    expect(getContentFitNotice(currentLyrics, 10, 130)).toContain(
      "当前歌词较长",
    );
    expect(
      getContentFitNotice(
        { ...currentLyrics, vocalStyle: "instrumental" },
        1_000,
        1_000,
      ),
    ).toBeNull();
  });
});
