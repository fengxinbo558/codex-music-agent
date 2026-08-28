import type { LocalAudioHealth, LocalAudioJob } from "../types";

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
