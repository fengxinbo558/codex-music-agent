import type { MusicAsset, MusicClip, ProjectVersion } from "../types";
import { normalizeGenerationPreferences } from "../data/generationPreferences";

type CreateAudioAssetInput = {
  id: string;
  name: string;
  type: MusicAsset["type"];
  blob: Blob;
  durationSeconds: number;
  waveform: number[];
  origin: string;
  projectId?: string;
  versionId?: string;
  bpm?: number;
  musicKey?: string;
  visibility?: MusicAsset["visibility"];
  audioRole?: MusicAsset["audioRole"];
};

export function createAudioAsset(input: CreateAudioAssetInput): MusicAsset {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    duration: formatAssetDuration(input.durationSeconds),
    durationSeconds: input.durationSeconds,
    mimeType: input.blob.type || "audio/wav",
    size: input.blob.size,
    waveform: input.waveform,
    localBlobKey: input.id,
    syncState: "local",
    origin: input.origin,
    projectId: input.projectId,
    versionId: input.versionId,
    visibility: input.visibility ?? "visible",
    audioRole: input.audioRole,
    bpm: input.bpm,
    musicKey: input.musicKey,
    favorite: false,
    createdAt: new Date().toISOString(),
  };
}

export function formatAssetDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function clipToAudioRange(
  clip: Pick<MusicClip, "start" | "duration">,
  audioDuration: number,
  projectDuration: number,
) {
  if (audioDuration <= 0 || projectDuration <= 0) return { start: 0, end: 0 };
  const start = Math.max(
    0,
    Math.min(audioDuration, (clip.start / projectDuration) * audioDuration),
  );
  const end = Math.max(
    start,
    Math.min(
      audioDuration,
      ((clip.start + clip.duration) / projectDuration) * audioDuration,
    ),
  );
  return { start, end };
}

export function versionsForStorage(versions: ProjectVersion[]) {
  return versions.map(({ audioUrl: _audioUrl, ...version }) => version);
}

export function versionsFromStorage(value: unknown): ProjectVersion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredVersion).map((version) => ({
    ...version,
    preferences: version.preferences
      ? normalizeGenerationPreferences(version.preferences)
      : undefined,
  }));
}

export function visibleAudioAssets(assets: MusicAsset[]) {
  return assets.filter((asset) => asset.visibility !== "internal");
}

function isStoredVersion(value: unknown): value is ProjectVersion {
  if (!value || typeof value !== "object") return false;
  const version = value as Partial<ProjectVersion>;
  return (
    typeof version.id === "string" &&
    typeof version.label === "string" &&
    typeof version.note === "string" &&
    (version.source === "demo" || version.source === "generated")
  );
}
