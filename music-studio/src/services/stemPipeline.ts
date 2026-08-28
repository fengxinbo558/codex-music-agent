import type { MusicAsset, StemRole } from "../types";
import { createAudioAsset } from "./audioAssets";
import { analyzeAudioBlob } from "./audioAnalysis";
import type { LocalAudioClient } from "./localAudioClient";
import type { LocalAudioStore } from "./localAudioStore";

const STEM_ROLES: StemRole[] = ["vocals", "drums", "bass", "other"];

type StemPipelineInput = {
  sourceAsset: MusicAsset;
  sourceBlob: Blob;
  versionId: string;
  projectId: string;
  client: LocalAudioClient;
  store: LocalAudioStore;
  analyze?: typeof analyzeAudioBlob;
  onJob?: (jobId: string) => void;
  onProgress?: (progress: number, label: string) => void;
};

export type StemPipelineResult = {
  jobId: string;
  assets: MusicAsset[];
  assetIds: Record<StemRole, string>;
  quality: {
    passed: boolean;
    relativeReconstructionError: number;
  };
};

export async function runStemPipeline(
  input: StemPipelineInput,
): Promise<StemPipelineResult> {
  const submitted = await input.client.submitStems(
    input.sourceBlob,
    input.sourceAsset.name,
  );
  input.onJob?.(submitted.id);
  const completed = await input.client.waitForJob(
    submitted.id,
    (job) => input.onProgress?.(job.progress, job.label),
  );
  const roles = readRoles(completed.result?.roles);
  const quality = readQuality(completed.result?.quality);
  if (!quality.passed) {
    throw new Error("四条音轨没有通过重构质量检查，因此不会显示为可编辑分轨。");
  }

  const assets: MusicAsset[] = [];
  try {
    for (const role of STEM_ROLES) {
      const blob = await input.client.getAssetBlob(roles[role]);
      const analysis = await (input.analyze ?? analyzeAudioBlob)(blob);
      if (Math.abs(analysis.duration - input.sourceAsset.durationSeconds) > 0.2) {
        throw new Error(`${stemRoleLabel(role)}时长与完整歌曲不一致。`);
      }
      const asset = createAudioAsset({
        id: `asset-${input.versionId}-stem-${role}`,
        name: `${input.sourceAsset.name.replace(/\.wav$/i, "")}·${stemRoleLabel(role)}.wav`,
        type: role === "vocals" ? "vocal" : "generated",
        blob,
        durationSeconds: analysis.duration,
        waveform: analysis.waveform,
        origin: `${input.sourceAsset.origin} · Demucs 真实分轨`,
        projectId: input.projectId,
        versionId: input.versionId,
        bpm: input.sourceAsset.bpm,
        musicKey: input.sourceAsset.musicKey,
        visibility: "internal",
        audioRole: `stem-${role}`,
      });
      await input.store.save(asset, blob);
      assets.push(asset);
    }
  } catch (error) {
    await input.store.deleteMany(assets);
    throw error;
  }
  return {
    jobId: completed.id,
    assets,
    assetIds: Object.fromEntries(
      assets.map((asset, index) => [STEM_ROLES[index], asset.id]),
    ) as Record<StemRole, string>,
    quality,
  };
}

function readRoles(value: unknown): Record<StemRole, string> {
  if (!value || typeof value !== "object") {
    throw new Error("真实分轨任务没有返回音轨映射。");
  }
  const record = value as Record<string, unknown>;
  const pairs = STEM_ROLES.map((role) => [role, record[role]] as const);
  if (pairs.some(([, assetId]) => typeof assetId !== "string" || !assetId)) {
    throw new Error("真实分轨结果不完整，缺少人声、鼓、贝斯或其他乐器。");
  }
  return Object.fromEntries(pairs) as Record<StemRole, string>;
}

function readQuality(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("真实分轨任务缺少重构质量报告。");
  }
  const record = value as Record<string, unknown>;
  return {
    passed: record.passed === true,
    relativeReconstructionError: Number(record.relative_reconstruction_error),
  };
}

export function stemRoleLabel(role: StemRole) {
  return { vocals: "人声", drums: "鼓", bass: "贝斯", other: "其他乐器" }[
    role
  ];
}
