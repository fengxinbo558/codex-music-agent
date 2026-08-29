import type {
  LocalAudioHealth,
  LocalAudioJob,
  LyricAlignmentQuality,
  LyricCue,
} from "../types";

const DIRECT_LOCAL_AUDIO_ORIGIN = "http://127.0.0.1:8002";

export class LocalAudioClient {
  constructor(
    private readonly origin = defaultLocalAudioOrigin(),
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  async health(): Promise<LocalAudioHealth | null> {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await this.fetcher(`${this.origin}/health`, {
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return (await response.json()) as LocalAudioHealth;
    } catch {
      return null;
    } finally {
      globalThis.clearTimeout(timer);
    }
  }

  async submitStems(blob: Blob, filename: string) {
    const form = new FormData();
    form.append("audio", blob, filename);
    return this.requestJob("/local-audio/stems", form);
  }

  async alignLyrics(input: {
    blob: Blob;
    filename: string;
    lyrics: string[];
    keyTerms: string[];
  }) {
    const form = new FormData();
    form.append("audio", input.blob, input.filename);
    form.append("lyrics", JSON.stringify(input.lyrics));
    form.append("key_terms", JSON.stringify(input.keyTerms));
    const submitted = await this.requestJob("/local-audio/align-lyrics", form);
    const completed = await this.waitForJob(submitted.id);
    return readAlignmentResult(completed);
  }

  async analyzePitch(input: {
    blob: Blob;
    filename: string;
    startSeconds: number;
    endSeconds: number;
  }) {
    const form = rangeForm(input);
    const response = await this.fetcher(
      `${this.origin}/local-audio/analyze-pitch`,
      { method: "POST", body: form },
    );
    if (!response.ok) throw await responseError(response, "基频分析失败");
    return (await response.json()) as {
      job: LocalAudioJob;
      analysis: {
        median_hz: number | null;
        voiced_ratio: number;
        editable: boolean;
        reason: string;
      };
    };
  }

  async shiftPitch(input: {
    blob: Blob;
    filename: string;
    startSeconds: number;
    endSeconds: number;
    semitones: number;
  }) {
    const form = rangeForm(input);
    form.append("semitones", String(input.semitones));
    return this.requestJob("/local-audio/shift-pitch", form);
  }

  async mixStems(input: {
    vocals: Blob;
    drums: Blob;
    bass: Blob;
    other: Blob;
  }) {
    const form = new FormData();
    form.append("vocals", input.vocals, "vocals.wav");
    form.append("drums", input.drums, "drums.wav");
    form.append("bass", input.bass, "bass.wav");
    form.append("other", input.other, "other.wav");
    return this.requestJob("/local-audio/mix-stems", form);
  }

  async getJob(jobId: string) {
    const response = await this.fetcher(
      `${this.origin}/local-audio/jobs/${encodeURIComponent(jobId)}`,
    );
    if (!response.ok) throw await responseError(response, "本机音频任务不存在");
    return (await response.json()) as LocalAudioJob;
  }

  async deleteJob(jobId: string) {
    const response = await this.fetcher(
      `${this.origin}/local-audio/jobs/${encodeURIComponent(jobId)}`,
      { method: "DELETE" },
    );
    if (response.status === 404) return;
    if (!response.ok) throw await responseError(response, "本机音频任务删除失败");
  }

  async waitForJob(
    jobId: string,
    onProgress?: (job: LocalAudioJob) => void,
    timeoutMs = 45 * 60 * 1_000,
  ) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const job = await this.getJob(jobId);
      onProgress?.(job);
      if (job.status === "ready") return job;
      if (job.status === "failed" || job.status === "cancelled") {
        throw new Error(job.error || job.label);
      }
      await wait(1_500);
    }
    throw new Error("本机音频任务等待超时；任务仍保留，可稍后恢复。");
  }

  async getAssetBlob(assetId: string) {
    const response = await this.fetcher(
      `${this.origin}/local-audio/assets/${encodeURIComponent(assetId)}`,
    );
    if (!response.ok) throw await responseError(response, "音频资产读取失败");
    return response.blob();
  }

  private async requestJob(path: string, form: FormData) {
    const response = await this.fetcher(`${this.origin}${path}`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw await responseError(response, "本机音频任务没有启动");
    return (await response.json()) as LocalAudioJob;
  }
}

function readAlignmentResult(job: LocalAudioJob) {
  const result = job.result;
  const rawCues = Array.isArray(result?.cues) ? result.cues : [];
  const rawQuality = result?.quality;
  if (!rawQuality || typeof rawQuality !== "object") {
    throw new Error("真实歌词对齐没有返回质量报告。");
  }
  const qualityRecord = rawQuality as Record<string, unknown>;
  const status = String(qualityRecord.status);
  if (!["passed", "warning", "failed"].includes(status)) {
    throw new Error("真实歌词对齐返回了未知状态。");
  }
  const cues = rawCues.map((item, index) => {
    const cue = item as Record<string, unknown>;
    return {
      id: String(cue.id || `aligned-${index + 1}`),
      text: String(cue.text || ""),
      start: Number(cue.start),
      end: Number(cue.end),
      source: "aligned" as const,
      observedText: String(cue.observed_text || ""),
      matchRatio: Number(cue.match_ratio),
      confidence: Number(cue.confidence),
    } satisfies LyricCue;
  });
  const quality: LyricAlignmentQuality = {
    status: status as LyricAlignmentQuality["status"],
    overallMatch: Number(qualityRecord.overall_match),
    textPrecision: Number.isFinite(Number(qualityRecord.text_precision))
      ? Number(qualityRecord.text_precision)
      : undefined,
    lineCoverage: Number(qualityRecord.line_coverage),
    keyTermMatch: Number(qualityRecord.key_term_match),
    averageConfidence: Number(qualityRecord.average_confidence),
    vocalCoverage: Number(qualityRecord.vocal_coverage),
    unbiasedMatch: Number.isFinite(Number(qualityRecord.unbiased_match))
      ? Number(qualityRecord.unbiased_match)
      : undefined,
    matchedKeyTerms: Array.isArray(qualityRecord.matched_key_terms)
      ? qualityRecord.matched_key_terms.map(String)
      : [],
    warnings: Array.isArray(qualityRecord.warnings)
      ? qualityRecord.warnings.map(String)
      : [],
  };
  return {
    jobId: job.id,
    transcription: String(result?.transcription || ""),
    cues,
    quality,
  };
}

function defaultLocalAudioOrigin() {
  const location = globalThis.location;
  return location && /^https?:$/.test(location.protocol)
    ? `${location.origin}/local-audio-runtime`
    : DIRECT_LOCAL_AUDIO_ORIGIN;
}

export const localAudioClient = new LocalAudioClient();

function rangeForm(input: {
  blob: Blob;
  filename: string;
  startSeconds: number;
  endSeconds: number;
}) {
  const form = new FormData();
  form.append("audio", input.blob, input.filename);
  form.append("start_seconds", String(input.startSeconds));
  form.append("end_seconds", String(input.endSeconds));
  return form;
}

async function responseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return new Error(payload.detail || fallback);
  } catch {
    return new Error(`${fallback}（${response.status}）`);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
