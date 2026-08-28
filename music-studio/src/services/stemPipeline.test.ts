import { describe, expect, it, vi } from "vitest";

import type { LocalAudioJob, MusicAsset } from "../types";
import { createAudioAsset } from "./audioAssets";
import { runStemPipeline } from "./stemPipeline";

function audioAsset(): MusicAsset {
  return createAudioAsset({
    id: "mix",
    name: "完整歌曲.wav",
    type: "generated",
    blob: new Blob(["mix"], { type: "audio/wav" }),
    durationSeconds: 60,
    waveform: [0.2],
    origin: "完整歌曲",
  });
}

describe("stem pipeline", () => {
  it("downloads and saves all four real stem blobs only after quality passes", async () => {
    const completed: LocalAudioJob = {
      id: "job-1",
      kind: "stems",
      status: "ready",
      progress: 100,
      label: "完成",
      asset_ids: ["remote-v", "remote-d", "remote-b", "remote-o"],
      result: {
        roles: {
          vocals: "remote-v",
          drums: "remote-d",
          bass: "remote-b",
          other: "remote-o",
        },
        quality: {
          passed: true,
          relative_reconstruction_error: 0.04,
        },
      },
      error: null,
    };
    const wavBlob = await makeWavBlob(60);
    const client = {
      health: vi.fn(async () => ({ capabilities: { stems: true } })),
      submitStems: vi.fn(async () => ({ id: "job-1" })),
      waitForJob: vi.fn(async () => completed),
      getAssetBlob: vi.fn(async () => wavBlob),
    };
    const store = {
      save: vi.fn(async () => undefined),
      deleteMany: vi.fn(async () => undefined),
    };
    const result = await runStemPipeline({
      sourceAsset: audioAsset(),
      sourceBlob: wavBlob,
      versionId: "version-1",
      projectId: "project-1",
      client: client as never,
      store: store as never,
      analyze: async () => ({ duration: 60, waveform: [0.2, 0.6] }),
    });
    expect(result.assets.map((asset) => asset.audioRole)).toEqual([
      "stem-vocals",
      "stem-drums",
      "stem-bass",
      "stem-other",
    ]);
    expect(store.save).toHaveBeenCalledTimes(4);
    expect(result.quality.relativeReconstructionError).toBe(0.04);
  });

  it("does not save stems when the service quality gate fails", async () => {
    const client = {
      health: vi.fn(async () => ({ capabilities: { stems: true } })),
      submitStems: vi.fn(async () => ({ id: "job-2" })),
      waitForJob: vi.fn(async () => ({
        id: "job-2",
        result: {
          roles: { vocals: "v", drums: "d", bass: "b", other: "o" },
          quality: { passed: false, relative_reconstruction_error: 0.7 },
        },
      })),
    };
    const store = { save: vi.fn(), deleteMany: vi.fn() };
    await expect(
      runStemPipeline({
        sourceAsset: audioAsset(),
        sourceBlob: new Blob(["mix"], { type: "audio/wav" }),
        versionId: "version-2",
        projectId: "project-1",
        client: client as never,
        store: store as never,
      }),
    ).rejects.toThrow("质量检查");
    expect(store.save).not.toHaveBeenCalled();
  });
});

async function makeWavBlob(duration: number) {
  const sampleRate = 10;
  const dataLength = duration * sampleRate;
  const buffer = new ArrayBuffer(44 + dataLength * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) =>
    [...text].forEach((character, index) =>
      view.setUint8(offset + index, character.charCodeAt(0)),
    );
  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength * 2, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataLength * 2, true);
  return new Blob([buffer], { type: "audio/wav" });
}
