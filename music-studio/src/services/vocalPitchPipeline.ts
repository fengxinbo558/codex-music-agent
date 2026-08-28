import type { LocalAudioClient } from "./localAudioClient";

type VocalPitchPipelineInput = {
  client: LocalAudioClient;
  vocals: Blob;
  drums: Blob;
  bass: Blob;
  other: Blob;
  startSeconds: number;
  endSeconds: number;
  semitones: number;
  onProgress?: (label: string) => void;
};

export type VocalPitchPipelineResult = {
  editedVocals: Blob;
  editedMix: Blob;
  pitchAnalysis: {
    medianHz: number;
    voicedRatio: number;
  };
};

export async function runVocalPitchPipeline(
  input: VocalPitchPipelineInput,
): Promise<VocalPitchPipelineResult> {
  input.onProgress?.("正在确认这句是否有稳定人声基频");
  const analyzed = await input.client.analyzePitch({
    blob: input.vocals,
    filename: "vocals.wav",
    startSeconds: input.startSeconds,
    endSeconds: input.endSeconds,
  });
  if (!analyzed.analysis.editable || !analyzed.analysis.median_hz) {
    throw new Error(analyzed.analysis.reason || "这句没有检测到可编辑的稳定音高。");
  }

  input.onProgress?.(`正在把选中句移动 ${formatSemitones(input.semitones)}`);
  const shifted = await input.client.shiftPitch({
    blob: input.vocals,
    filename: "vocals.wav",
    startSeconds: input.startSeconds,
    endSeconds: input.endSeconds,
    semitones: input.semitones,
  });
  const shiftedJob = await input.client.waitForJob(shifted.id);
  const shiftedAssetId = shiftedJob.asset_ids[0];
  if (!shiftedAssetId) throw new Error("音高处理没有返回真实人声音频。");
  const editedVocals = await input.client.getAssetBlob(shiftedAssetId);

  input.onProgress?.("正在把编辑后的人声重新混回乐器");
  const mixed = await input.client.mixStems({
    vocals: editedVocals,
    drums: input.drums,
    bass: input.bass,
    other: input.other,
  });
  const mixedJob = await input.client.waitForJob(mixed.id);
  const mixedAssetId = mixedJob.asset_ids[0];
  if (!mixedAssetId) throw new Error("新混音没有返回真实音频。");
  const editedMix = await input.client.getAssetBlob(mixedAssetId);
  return {
    editedVocals,
    editedMix,
    pitchAnalysis: {
      medianHz: analyzed.analysis.median_hz,
      voicedRatio: analyzed.analysis.voiced_ratio,
    },
  };
}

function formatSemitones(value: number) {
  return `${value > 0 ? "+" : ""}${value} 个半音`;
}
