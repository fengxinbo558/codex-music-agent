import { describe, expect, it } from "vitest";

import type { ProjectVersion } from "../types";
import {
  clipToAudioRange,
  createAudioAsset,
  formatAssetDuration,
  versionsForStorage,
  versionsFromStorage,
  visibleAudioAssets,
} from "./audioAssets";

describe("audio assets", () => {
  it("creates a real local asset from a Blob", () => {
    const blob = new Blob(["audio"], { type: "audio/wav" });
    const asset = createAudioAsset({
      id: "asset-a",
      name: "版本 A.wav",
      type: "generated",
      blob,
      durationSeconds: 30,
      waveform: [0.2, 0.8],
      origin: "版本 04",
    });

    expect(asset).toMatchObject({
      id: "asset-a",
      duration: "00:30",
      durationSeconds: 30,
      mimeType: "audio/wav",
      size: 5,
      localBlobKey: "asset-a",
      syncState: "local",
    });
  });

  it("maps project clips to the real audio duration", () => {
    expect(clipToAudioRange({ start: 48, duration: 24 }, 30, 96)).toEqual({
      start: 15,
      end: 22.5,
    });
    expect(clipToAudioRange({ start: 90, duration: 20 }, 30, 96)).toEqual({
      start: 28.125,
      end: 30,
    });
  });

  it("formats durations without decorative placeholders", () => {
    expect(formatAssetDuration(65.4)).toBe("01:05");
    expect(formatAssetDuration(-1)).toBe("00:00");
  });

  it("removes session Blob URLs before persisting versions", () => {
    const version: ProjectVersion = {
      id: "v1",
      label: "版本 01",
      createdAt: "刚刚",
      note: "真实结果",
      source: "generated",
      audioUrl: "blob:expired",
      audioAssetId: "asset-a",
    };

    expect(versionsForStorage([version])[0]).not.toHaveProperty("audioUrl");
    expect(versionsFromStorage(versionsForStorage([version]))[0]).toMatchObject(
      {
        id: "v1",
        audioAssetId: "asset-a",
      },
    );
    expect(versionsFromStorage({ bad: true })).toEqual([]);
  });

  it("migrates old stored preferences and hides internal source assets", () => {
    const version: ProjectVersion = {
      id: "v-old",
      label: "版本 03",
      createdAt: "昨天",
      note: "旧版本",
      source: "generated",
      preferences: {
        duration: 30,
        vocalStyle: "female",
        lyricsMode: "auto",
        creativity: "balanced",
        variantCount: 1,
      } as ProjectVersion["preferences"],
    };
    const visible = createAudioAsset({
      id: "mastered",
      name: "优化.wav",
      type: "generated",
      blob: new Blob(["mastered"], { type: "audio/wav" }),
      durationSeconds: 30,
      waveform: [1],
      origin: "优化结果",
      audioRole: "mastered",
    });
    const internal = {
      ...visible,
      id: "source",
      localBlobKey: "source",
      visibility: "internal" as const,
      audioRole: "source" as const,
    };

    expect(versionsFromStorage([version])[0].preferences?.toneProfile).toBe(
      "warm",
    );
    expect(visibleAudioAssets([internal, visible])).toEqual([visible]);
  });
});
