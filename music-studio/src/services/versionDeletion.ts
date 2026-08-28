import type { MusicAsset, ProjectVersion } from "../types";

type VersionDeletionInput = {
  versionId: string;
  versions: ProjectVersion[];
  assets: MusicAsset[];
};

export type VersionDeletionPlan = {
  target?: ProjectVersion;
  remainingVersions: ProjectVersion[];
  assetIds: string[];
};

export function planVersionDeletion({
  versionId,
  versions,
  assets,
}: VersionDeletionInput): VersionDeletionPlan {
  const target = versions.find((version) => version.id === versionId);
  if (!target) return { remainingVersions: versions, assetIds: [] };

  const remainingVersions = versions.filter(
    (version) => version.id !== versionId,
  );
  const retainedAssetIds = new Set(
    remainingVersions.flatMap(referencedAssetIds),
  );
  const targetAssetIds = new Set([
    ...referencedAssetIds(target),
    ...assets
      .filter((asset) => asset.versionId === versionId)
      .map((asset) => asset.id),
  ]);
  const assetIds = [...targetAssetIds].filter(
    (assetId) => !retainedAssetIds.has(assetId),
  );

  return { target, remainingVersions, assetIds };
}

function referencedAssetIds(version: ProjectVersion) {
  return [
    version.audioAssetId,
    version.mastering?.sourceAssetId,
    ...Object.values(version.stems?.assetIds ?? {}),
  ].filter(
    (assetId): assetId is string => Boolean(assetId),
  );
}
