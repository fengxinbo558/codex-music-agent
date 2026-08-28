import { describe, expect, it } from "vitest";

import { createWaveform } from "./audioAnalysis";

describe("createWaveform", () => {
  it("builds normalized peaks from real sample values", () => {
    const samples = new Float32Array([0, 0.1, -0.4, 0.2, 0.8, -0.6, 0.2, 0]);

    expect(createWaveform(samples, 4)).toEqual([0.125, 0.5, 1, 0.25]);
  });

  it("does not invent a waveform for empty audio", () => {
    expect(createWaveform(new Float32Array(), 16)).toEqual([]);
  });
});
