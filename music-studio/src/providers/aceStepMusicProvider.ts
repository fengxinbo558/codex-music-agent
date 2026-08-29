import type {
  GeneratedAudio,
  GenerationPreferences,
  GenerationReferenceInput,
  MusicBrief,
  MusicEngineStatus,
} from "../types";
import { normalizeGenerationPreferences } from "../data/generationPreferences";
import { tonePrompt } from "../data/toneProfiles";
import { vocalDeliveryPrompt } from "../data/vocalDelivery";
import { vocalClarityPrompt } from "../data/vocalClarity";
import type { GenerationProgress, MusicProvider } from "./mockMusicProvider";

const ACE_STEP_ORIGIN = "http://127.0.0.1:8001";
const HEALTH_TIMEOUT_MS = 1_800;
const POLL_INTERVAL_MS = 2_000;
const GENERATION_TIMEOUT_MS = 90 * 60 * 1_000;
const DEFAULT_DURATION_SECONDS = 30;

type ApiEnvelope<T> = {
  data: T;
  code: number;
  error: string | null;
};

type TaskResult = {
  task_id: string;
  status: 0 | 1 | 2;
  result: string;
  progress_text?: string;
};

type AudioResult = {
  file?: string;
  error?: string;
  metas?: { duration?: number };
  progress?: number;
  stage?: string;
  seed_value?: string;
};

export async function checkAceStepHealth() {
  return (await getAceStepStatus()) !== "offline";
}

export async function getAceStepStatus(): Promise<MusicEngineStatus> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    HEALTH_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`${ACE_STEP_ORIGIN}/health`, {
      signal: controller.signal,
    });
    if (!response.ok) return "offline";
    const payload = (await response.json()) as ApiEnvelope<{
      status?: string;
      models_initialized?: boolean;
    }>;
    if (payload.code !== 200 || payload.data?.status !== "ok") return "offline";
    return payload.data.models_initialized ? "ready" : "preparing";
  } catch {
    return "offline";
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export const automaticMusicProvider: MusicProvider = {
  id: "automatic-local",
  name: "ACE-Step 本地优先",
  async generate(brief, preferences, onProgress, reference) {
    if (!(await checkAceStepHealth())) {
      throw new Error(
        reference
          ? "参考音频模式需要 ACE-Step 真实模型，当前模型没有启动。"
          : "ACE-Step 真实音乐模型未启动。本次没有创建歌曲，请先到“模型”页启动后再生成。",
      );
    }
    return generateWithAceStep(brief, preferences, onProgress, reference);
  },
};

async function generateWithAceStep(
  brief: MusicBrief,
  preferences: GenerationPreferences,
  onProgress: (event: GenerationProgress) => void,
  reference?: GenerationReferenceInput,
): Promise<GeneratedAudio[]> {
  onProgress({
    progress: 29,
    stage: "model_submitting",
    label: reference
      ? reference.mode === "style"
        ? "ACE-Step 正在读取参考风格"
        : "ACE-Step 正在读取源音频和重编要求"
      : "ACE-Step 正在接收制作方案",
  });
  const request = createAceStepRequest(brief, preferences, reference);
  const release = reference
    ? await postMultipart<
        ApiEnvelope<{
          task_id: string;
          status: string;
          queue_position?: number;
        }>
      >("/release_task", createAceStepFormData(request, reference))
    : await postJson<
        ApiEnvelope<{
          task_id: string;
          status: string;
          queue_position?: number;
        }>
      >("/release_task", request);

  if (release.code !== 200 || !release.data?.task_id) {
    throw new Error(
      release.error || "ACE-Step 没有接受生成任务，请检查模型服务。",
    );
  }

  const taskId = release.data.task_id;
  onProgress({
    progress: 32,
    stage: "model_accepted",
    label: `ACE-Step 已接受任务 ${taskId.slice(0, 8)}`,
  });
  const startedAt = Date.now();
  let displayedProgress = 32;

  while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
    await wait(POLL_INTERVAL_MS);
    const query = await postJson<ApiEnvelope<TaskResult[]>>("/query_result", {
      task_id_list: [taskId],
    });
    const task = query.data?.[0];
    if (!task) continue;

    const details = parseAudioResults(task.result);
    const first = details[0];
    if (task.status === 2) {
      throw new Error(
        first?.error || task.progress_text || "ACE-Step 生成失败，请重试。",
      );
    }
    if (task.status === 1) {
      const available = details
        .filter((detail): detail is AudioResult & { file: string } =>
          Boolean(detail.file),
        )
        .slice(0, preferences.variantCount);
      if (!available.length)
        throw new Error("ACE-Step 已完成，但没有返回音频文件。");
      onProgress({
        progress: 96,
        stage: "audio_received",
        label: `${available.length} 个真实版本已生成，正在载入试听`,
      });
      const generated = await Promise.all(
        available.map(async (detail, index) => {
          const audioResponse = await fetch(toAbsoluteUrl(detail.file));
          if (!audioResponse.ok)
            throw new Error("生成完成，但音频文件读取失败。");
          const audioBlob = await audioResponse.blob();
          return {
            url: URL.createObjectURL(audioBlob),
            blob: audioBlob,
            duration: Number(detail.metas?.duration) || preferences.duration,
            tracks: [],
            provider: "ACE-Step 1.5（本地）",
            costLabel: "本机生成 · 不产生按次 API 费用",
            seed: seedForResult(detail.seed_value, index),
          } satisfies GeneratedAudio;
        }),
      );
      onProgress({ progress: 100, label: "ACE-Step 真实音乐已就绪" });
      return generated;
    }

    const reported = Number(first?.progress);
    displayedProgress =
      Number.isFinite(reported) && reported > 0
        ? Math.max(displayedProgress, Math.min(94, 32 + reported * 0.62))
        : Math.min(
            first?.stage === "queued" ? 58 : 92,
            displayedProgress + 0.18,
          );
    onProgress({
      progress: Math.round(displayedProgress),
      stage: "model_running",
      label: friendlyStage(first?.stage || task.progress_text),
    });
  }

  throw new Error("ACE-Step 生成超时，任务已保留，可以稍后重试。");
}

export function createAceStepRequest(
  brief: MusicBrief,
  preferences: GenerationPreferences,
  reference?: GenerationReferenceInput,
) {
  const resolvedPreferences = normalizeGenerationPreferences(preferences);
  const creativity = {
    stable: { lm_temperature: 0.7, lm_top_p: 0.82 },
    balanced: { lm_temperature: 0.85, lm_top_p: 0.9 },
    surprise: { lm_temperature: 1, lm_top_p: 0.95 },
  }[resolvedPreferences.creativity];
  const tone = tonePrompt(
    resolvedPreferences.toneProfile,
    resolvedPreferences.vocalStyle,
  );
  const delivery = vocalDeliveryPrompt(
    resolvedPreferences.vocalDelivery,
    resolvedPreferences.vocalStyle,
  );
  const clarity = vocalClarityPrompt(
    resolvedPreferences.lyricClarity,
    resolvedPreferences.vocalStyle,
  );

  return {
    prompt: createMusicPrompt(
      brief,
      resolvedPreferences,
      [tone.positive, delivery.positive, clarity.positive]
        .filter(Boolean)
        .join(", "),
    ),
    lm_negative_prompt: [tone.negative, delivery.negative, clarity.negative]
      .filter(Boolean)
      .join(", "),
    lyrics:
      resolvedPreferences.vocalStyle === "instrumental"
        ? ""
        : brief.lyrics.join("\n"),
    thinking: reference?.mode === "cover" ? false : true,
    vocal_language: brief.language.toLowerCase().includes("english")
      ? "en"
      : "zh",
    bpm: brief.bpm,
    key_scale: brief.key,
    time_signature: "4",
    audio_duration: resolvedPreferences.duration,
    inference_steps: 8,
    shift: clarity.shift,
    lm_cfg_scale: clarity.lmCfgScale,
    batch_size: resolvedPreferences.variantCount,
    audio_format: "wav",
    model: "acestep-v15-turbo",
    lm_model_path: "acestep-5Hz-lm-1.7B",
    lm_backend: "mlx",
    use_cot_caption: true,
    use_cot_language: true,
    task_type: reference?.mode === "cover" ? "cover" : "text2music",
    audio_cover_strength: reference?.strength ?? 1,
    ...creativity,
  };
}

export function createAceStepFormData(
  request: ReturnType<typeof createAceStepRequest>,
  reference: GenerationReferenceInput,
) {
  const form = new FormData();
  Object.entries(request).forEach(([key, value]) => {
    form.append(key, String(value));
  });
  form.append(
    reference.mode === "style" ? "ref_audio" : "ctx_audio",
    reference.blob,
    reference.name,
  );
  return form;
}

function createMusicPrompt(
  brief: MusicBrief,
  preferences: GenerationPreferences,
  toneDirection: string,
) {
  const vocalDirection = {
    female: "female vocal",
    male: "male vocal",
    instrumental: "instrumental, no vocals",
  }[preferences.vocalStyle];
  return [
    brief.genre,
    brief.mood,
    vocalDirection,
    `instruments: ${brief.instruments.join(", ")}`,
    `structure: ${brief.structure.join(", ")}`,
    brief.summary,
    preferences.vocalStyle === "instrumental" ? "" : brief.vocalMode,
    preferences.vocalStyle !== "instrumental" &&
    preferences.lyricClarity === "clear"
      ? "sing only the supplied Mandarin lyrics in exact order, no paraphrased, added, omitted, or repeated words"
      : "",
    toneDirection,
  ]
    .filter(Boolean)
    .join(". ");
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${ACE_STEP_ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`ACE-Step 服务返回 ${response.status}，请稍后重试。`);
  }
  return (await response.json()) as T;
}

async function postMultipart<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${ACE_STEP_ORIGIN}${path}`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(`ACE-Step 服务返回 ${response.status}，请稍后重试。`);
  }
  return (await response.json()) as T;
}

function parseAudioResults(value: string): AudioResult[] {
  try {
    const parsed = JSON.parse(value) as AudioResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toAbsoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `${ACE_STEP_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function seedForResult(value: string | undefined, index: number) {
  if (!value) return undefined;
  const seeds = value
    .split(",")
    .map((seed) => seed.trim())
    .filter(Boolean);
  return seeds[index] ?? seeds[0];
}

function friendlyStage(stage?: string) {
  if (!stage) return "ACE-Step 正在创作音乐";
  const lower = stage.toLowerCase();
  if (lower.includes("queue"))
    return "第一次正在下载并加载模型，请保持窗口打开";
  if (lower.includes("load") || lower.includes("init"))
    return "正在加载本地音乐模型";
  if (lower.includes("lm") || lower.includes("code"))
    return "正在构思旋律与演唱结构";
  if (lower.includes("diff") || lower.includes("infer"))
    return "正在生成音乐细节";
  if (lower.includes("vae") || lower.includes("decode"))
    return "正在合成最终音频";
  return stage.length > 42 ? "ACE-Step 正在创作音乐" : stage;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
