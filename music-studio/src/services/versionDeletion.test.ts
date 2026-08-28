import { describe, expect, it } from "vitest";

import type { MusicAsset, ProjectVersion } from "../types";
import { planVersionDeletion } from "./versionDeletion";

const versions: ProjectVersion[] = [
  {
    id: "child",
    label: "版本 02",
    createdAt: "刚刚",
    note: "温暖重制",
    source: "generated",
    audioAssetId: "child-master",
    parentVersionId: "parent",
    mastering: {
      profile: "warm",
      sourceAssetId: "shared-source",
      status: "complete",
    },
  },
  {
    id: "parent",
    label: "版本 01",
    createdAt: "稍早",
    note: "模型原声",
    source: "generated",
    audioAssetId: "shared-source",
  },
];

const assets = [
  asset("shared-source", "parent"),
  asset("child-master", "child"),
  asset("child-stem", "child"),
];

describe("version deletion", () => {
  it("deletes only assets owned exclusively by the target version", () => {
    expect(
      planVersionDeletion({ versionId: "child", versions, assets }),
    ).toEqual({
      target: versions[0],
      remainingVersions: [versions[1]],
      assetIds: ["child-master", "child-stem"],
    });
  });

  it("retains an asset that another version still references", () => {
    expect(
      planVersionDeletion({ versionId: "parent", versions, assets }),
    ).toEqual({
      target: versions[1],
      remainingVersions: [versions[0]],
      assetIds: [],
    });
  });

  it("does nothing for an unknown version", () => {
    expect(
      planVersionDeletion({ versionId: "missing", versions, assets }),
    ).toEqual({ remainingVersions: versions, assetIds: [] });
  });

  it("keeps shared stems when an edited child version still uses them", () => {
    const versionsWithStems: ProjectVersion[] = [
      {
        ...versions[0],
        stems: {
          status: "ready",
          assetIds: { drums: "shared-drums", vocals: "edited-vocals" },
        },
      },
      {
        ...versions[1],
        stems: {
          status: "ready",
          assetIds: { drums: "shared-drums", vocals: "parent-vocals" },
        },
      },
    ];
    const stemAssets = [
      ...assets,
      asset("shared-drums", "parent"),
      asset("parent-vocals", "parent"),
      asset("edited-vocals", "child"),
    ];
    const plan = planVersionDeletion({
      versionId: "parent",
      versions: versionsWithStems,
      assets: stemAssets,
    });
    expect(plan.assetIds).toContain("parent-vocals");
    expect(plan.assetIds).not.toContain("shared-drums");
  });
});

function asset(id: string, versionId: string): MusicAsset {
  return {
    id,
    name: `${id}.wav`,
    type: "generated",
    duration: "00:30",
    durationSeconds: 30,
    mimeType: "audio/wav",
    size: 10,
    waveform: [0.2, 0.8],
    localBlobKey: id,
    syncState: "local",
    origin: "测试",
    versionId,
    favorite: false,
    createdAt: "2026-08-29T00:00:00.000Z",
  };
}
