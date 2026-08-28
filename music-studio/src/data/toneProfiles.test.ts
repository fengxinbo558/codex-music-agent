import { describe, expect, it } from "vitest";

import {
  DEFAULT_GENERATION_PREFERENCES,
  normalizeGenerationPreferences,
  summarizePreferences,
} from "./generationPreferences";
import { TONE_PROFILES, tonePrompt } from "./toneProfiles";

describe("tone profiles", () => {
  it("migrates old generation settings to the warm default", () => {
    const preferences = normalizeGenerationPreferences({
      duration: 60,
      vocalStyle: "male",
      lyricsMode: "current",
      creativity: "stable",
      variantCount: 2,
    });

    expect(preferences.toneProfile).toBe("warm");
    expect(summarizePreferences(preferences)).toContain("温暖细腻");
    expect(DEFAULT_GENERATION_PREFERENCES.toneProfile).toBe("warm");
  });

  it("keeps warm processing gentle but stronger than natural", () => {
    const warm = TONE_PROFILES.warm.mastering;
    const natural = TONE_PROFILES.natural.mastering;
    const bright = TONE_PROFILES.bright.mastering;

    expect(warm.highShelf.gain).toBeLessThan(natural.highShelf.gain);
    expect(natural.highShelf.gain).toBeLessThan(bright.highShelf.gain);
    expect(Math.abs(warm.highShelf.gain)).toBeLessThanOrEqual(3);
    expect(Math.abs(warm.presence.gain)).toBeLessThanOrEqual(3);
    expect(warm.compressor.ratio).toBeLessThanOrEqual(2);
    expect(warm.targetPeakDb).toBe(-1);
  });

  it("does not add vocal direction to instrumental prompts", () => {
    const vocal = tonePrompt("warm", "female");
    const instrumental = tonePrompt("warm", "instrumental");

    expect(vocal.positive).toContain("emotionally nuanced vocal");
    expect(vocal.negative).toContain("robotic phrasing");
    expect(instrumental.positive).not.toContain("vocal");
    expect(instrumental.negative).not.toContain("sibilance");
  });
});
