import { describe, expect, it, vi } from "vitest";

import type { LocalAudioClient } from "./localAudioClient";
import { runVocalPitchPipeline } from "./vocalPitchPipeline";

describe("vocal pitch pipeline", () => {
  it("analyzes, shifts and remixes a selected lyric region", async () => {
    const audio = new Blob(["wav"], { type: "audio/wav" });
    const client = {
      health: vi.fn(async () => ({
        status: "ok",
        service: "test",
        capabilities: { stems: true, pitch_analysis: true, pitch_shift: true },
      })),
      analyzePitch: vi.fn(async () => ({
        job: {},
        analysis: {
          median_hz: 220,
          voiced_ratio: 0.8,
          editable: true,
          reason: "检测到稳定人声基频",
        },
      })),
      shiftPitch: vi.fn(async () => ({ id: "shift" })),
      waitForJob: vi.fn(async (id: string) => ({
        id,
        asset_ids: [id === "shift" ? "edited-vocals" : "edited-mix"],
      })),
      getAssetBlob: vi.fn(async () => audio),
      mixStems: vi.fn(async () => ({ id: "mix" })),
    } as unknown as LocalAudioClient;

    const result = await runVocalPitchPipeline({
      client,
      vocals: audio,
      drums: audio,
      bass: audio,
      other: audio,
      startSeconds: 4,
      endSeconds: 8,
      semitones: 2,
    });

    expect(result.pitchAnalysis.medianHz).toBe(220);
    expect(client.shiftPitch).toHaveBeenCalledWith(
      expect.objectContaining({ startSeconds: 4, endSeconds: 8, semitones: 2 }),
    );
    expect(client.mixStems).toHaveBeenCalled();
  });

  it("refuses an unvoiced region instead of fabricating an edit", async () => {
    const client = {
      health: vi.fn(async () => ({
        status: "ok",
        capabilities: { stems: true, pitch_analysis: true, pitch_shift: true },
      })),
      analyzePitch: vi.fn(async () => ({
        analysis: {
          median_hz: null,
          voiced_ratio: 0,
          editable: false,
          reason: "选区缺少稳定基频，建议改用重新演唱",
        },
      })),
    } as unknown as LocalAudioClient;

    await expect(
      runVocalPitchPipeline({
        client,
        vocals: new Blob(),
        drums: new Blob(),
        bass: new Blob(),
        other: new Blob(),
        startSeconds: 0,
        endSeconds: 1,
        semitones: 1,
      }),
    ).rejects.toThrow("缺少稳定基频");
  });
});
