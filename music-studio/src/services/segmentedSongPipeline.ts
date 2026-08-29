import type {
  GeneratedAudio,
  GenerationPreferences,
  MusicBrief,
} from "../types";
import type { MusicProvider } from "../providers/mockMusicProvider";
import { encodeAudioBufferToWav } from "./audioMastering";
import type { LocalAudioClient } from "./localAudioClient";

export type LyricGenerationSegment = {
  modelLyrics: string[];
  approvedLyrics: string[];
  keyTerms: string[];
};

type SegmentedSongInput = {
  provider: MusicProvider;
  client: LocalAudioClient;
  brief: MusicBrief;
  preferences: GenerationPreferences;
  segments: LyricGenerationSegment[];
  onProgress: (progress: number, label: string) => void;
};

type ScreenedCandidate = {
  audio: GeneratedAudio;
  passed: boolean;
  score: number;
};

const MAX_BATCHES_PER_SEGMENT = 2;

export async function generateSegmentedSong(
  input: SegmentedSongInput,
): Promise<GeneratedAudio[]> {
  if (input.segments.length < 2) {
    throw new Error("分段生成至少需要两个歌词段落。");
  }
  const accepted: GeneratedAudio[] = [];
  for (const [segmentIndex, segment] of input.segments.entries()) {
    let winner: GeneratedAudio | undefined;
    for (
      let batch = 0;
      batch < MAX_BATCHES_PER_SEGMENT && !winner;
      batch += 1
    ) {
      input.onProgress(
        segmentProgress(segmentIndex, input.segments.length, 0),
        `正在生成第 ${segmentIndex + 1}/${input.segments.length} 段的第 ${batch + 1} 轮候选`,
      );
      const generated = await input.provider.generate(
        {
          ...input.brief,
          lyrics: segment.modelLyrics,
          structure: [`第 ${segmentIndex + 1} 段`, ...input.brief.structure],
        },
        {
          ...input.preferences,
          duration: 30,
          variantCount: 4,
        },
        ({ progress, label }) =>
          input.onProgress(
            segmentProgress(
              segmentIndex,
              input.segments.length,
              Math.min(0.56, progress / 180),
            ),
            `第 ${segmentIndex + 1} 段 · ${label}`,
          ),
      );
      input.onProgress(
        segmentProgress(segmentIndex, input.segments.length, 0.62),
        `正在核验第 ${segmentIndex + 1} 段的真实唱词`,
      );
      const screened = await Promise.all(
        generated.map((audio) => screenCandidate(audio, segment, input.client)),
      );
      winner = screened
        .filter((candidate) => candidate.passed)
        .sort((left, right) => right.score - left.score)[0]?.audio;
      generated.forEach((audio) => URL.revokeObjectURL(audio.url));
    }
    if (!winner) {
      accepted.forEach((audio) => URL.revokeObjectURL(audio.url));
      throw new Error(
        `第 ${segmentIndex + 1} 段的 8 个候选都没有通过真实唱词检查；系统没有拼出假整首，请重新生成这一轮。`,
      );
    }
    accepted.push(winner);
    input.onProgress(
      segmentProgress(segmentIndex, input.segments.length, 1),
      `第 ${segmentIndex + 1} 段已通过，继续下一段`,
    );
  }

  input.onProgress(92, "所有段落已通过，正在衔接成完整歌曲");
  const stitched = await stitchAudioSegments(
    accepted.map((audio) => audio.blob),
  );
  const first = accepted[0];
  return [
    {
      ...first,
      blob: stitched.blob,
      url: URL.createObjectURL(stitched.blob),
      duration: stitched.duration,
      provider: `${first.provider} · 分段严选`,
      costLabel: `${first.costLabel} · ${input.segments.length} 段逐段验收`,
      seed: accepted.map((audio) => audio.seed).filter(Boolean).join(" / "),
    },
  ];
}

async function screenCandidate(
  audio: GeneratedAudio,
  segment: LyricGenerationSegment,
  client: LocalAudioClient,
): Promise<ScreenedCandidate> {
  let stemJobId: string | undefined;
  let alignmentJobId: string | undefined;
  try {
    const submitted = await client.submitStems(audio.blob, "segment.wav");
    stemJobId = submitted.id;
    const stemJob = await client.waitForJob(submitted.id);
    const roles = stemJob.result?.roles;
    const vocalAssetId =
      roles && typeof roles === "object"
        ? String((roles as Record<string, unknown>).vocals ?? "")
        : "";
    if (!vocalAssetId) throw new Error("分段候选没有返回真实人声轨。");
    const vocals = await client.getAssetBlob(vocalAssetId);
    const alignment = await client.alignLyrics({
      blob: vocals,
      filename: "segment-vocals.wav",
      lyrics: segment.approvedLyrics,
      keyTerms: segment.keyTerms,
    });
    alignmentJobId = alignment.jobId;
    const quality = alignment.quality;
    return {
      audio,
      passed: quality.status === "passed",
      score:
        quality.overallMatch * 0.45 +
        quality.lineCoverage * 0.2 +
        quality.keyTermMatch * 0.15 +
        quality.averageConfidence * 0.1 +
        quality.vocalCoverage * 0.1,
    };
  } catch {
    return { audio, passed: false, score: 0 };
  } finally {
    await Promise.allSettled(
      [alignmentJobId, stemJobId]
        .filter((jobId): jobId is string => Boolean(jobId))
        .map((jobId) => client.deleteJob(jobId)),
    );
  }
}

export async function stitchAudioSegments(
  blobs: Blob[],
  requestedCrossfadeSeconds = 0.8,
) {
  if (!blobs.length) throw new Error("没有可以衔接的真实音频段落。");
  if (!window.AudioContext || !window.OfflineAudioContext) {
    throw new Error("当前环境不支持本机音频衔接。");
  }
  const decoding = new window.AudioContext();
  try {
    const buffers = await Promise.all(
      blobs.map(async (blob) =>
        decoding.decodeAudioData(await blob.arrayBuffer()),
      ),
    );
    const shortest = Math.min(...buffers.map((buffer) => buffer.duration));
    const crossfade = Math.max(
      0,
      Math.min(requestedCrossfadeSeconds, shortest / 4),
    );
    const duration =
      buffers.reduce((sum, buffer) => sum + buffer.duration, 0) -
      crossfade * (buffers.length - 1);
    const sampleRate = decoding.sampleRate;
    const channels = Math.max(
      1,
      Math.min(2, ...buffers.map((buffer) => buffer.numberOfChannels)),
    );
    const offline = new window.OfflineAudioContext(
      channels,
      Math.ceil(duration * sampleRate),
      sampleRate,
    );
    let offset = 0;
    buffers.forEach((buffer, index) => {
      const source = offline.createBufferSource();
      const gain = offline.createGain();
      source.buffer = buffer;
      source.connect(gain).connect(offline.destination);
      if (index > 0 && crossfade > 0) {
        gain.gain.setValueAtTime(0, offset);
        gain.gain.linearRampToValueAtTime(1, offset + crossfade);
      }
      if (index < buffers.length - 1 && crossfade > 0) {
        const fadeStart = offset + buffer.duration - crossfade;
        gain.gain.setValueAtTime(1, fadeStart);
        gain.gain.linearRampToValueAtTime(0, fadeStart + crossfade);
      }
      source.start(offset);
      offset += buffer.duration - crossfade;
    });
    const rendered = await offline.startRendering();
    return {
      blob: encodeAudioBufferToWav(rendered),
      duration: rendered.duration,
    };
  } finally {
    await decoding.close();
  }
}

function segmentProgress(index: number, total: number, fraction: number) {
  return Math.round(28 + ((index + fraction) / total) * 62);
}
