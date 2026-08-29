import { afterEach, describe, expect, it, vi } from "vitest";

import type { GenerationReferenceInput, MusicBrief } from "../types";
import { DEFAULT_GENERATION_PREFERENCES } from "../data/generationPreferences";
import {
  automaticMusicProvider,
  createAceStepFormData,
  createAceStepRequest,
  getAceStepStatus,
} from "./aceStepMusicProvider";

const brief: MusicBrief = {
  title: "雨停以前",
  summary: "雨夜里的克制中文 R&B",
  genre: "Alternative R&B",
  mood: "克制、温暖、逐渐打开",
  bpm: 82,
  key: "A minor",
  language: "Chinese",
  vocalMode: "intimate female vocal",
  instruments: ["warm bass", "soft drums", "atmospheric synth"],
  structure: ["intro", "verse", "chorus"],
  lyrics: ["城市把晚风折进衣角", "等一场雨替我们经过"],
  preserve: ["雨夜氛围"],
  change: ["副歌逐渐打开"],
  provider: "自动选择（ACE-Step 优先）",
  costLabel: "本地模型优先 · 不产生按次 API 费用",
};

describe("getAceStepStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports ready after the real models are initialized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          data: { status: "ok", models_initialized: true },
        }),
      }),
    );

    await expect(getAceStepStatus()).resolves.toBe("ready");
  });

  it("reports preparing while the server downloads or loads models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          data: { status: "ok", models_initialized: false },
        }),
      }),
    );

    await expect(getAceStepStatus()).resolves.toBe("preparing");
  });

  it("reports offline when the local service cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(getAceStepStatus()).resolves.toBe("offline");
  });

  it("maps novice choices to ACE-Step generation parameters", () => {
    const request = createAceStepRequest(brief, {
      ...DEFAULT_GENERATION_PREFERENCES,
      duration: 60,
      vocalStyle: "instrumental",
      vocalDelivery: "extremeScream",
      lyricsMode: "current",
      creativity: "surprise",
      variantCount: 2,
    });

    expect(request).toMatchObject({
      audio_duration: 60,
      batch_size: 2,
      lyrics: "",
      lm_temperature: 1,
      lm_top_p: 0.95,
    });
    expect(request.prompt).toContain("instrumental, no vocals");
    expect(request.prompt).not.toContain("intimate female vocal");
    expect(request.prompt).toContain("warm analog tone");
    expect(request.prompt).not.toContain("emotionally nuanced vocal");
    expect(request.lm_negative_prompt).toContain("harsh upper mids");
    expect(request.lm_negative_prompt).not.toContain("sibilance");
    expect(request.prompt).not.toContain("scream");
    expect(request.lm_negative_prompt).not.toContain("screech");
  });

  it("adds human vocal expression and anti-harshness guidance by default", () => {
    const request = createAceStepRequest(brief, DEFAULT_GENERATION_PREFERENCES);

    expect(request.prompt).toContain("emotionally nuanced vocal");
    expect(request.prompt).toContain("natural breath");
    expect(request.lm_negative_prompt).toContain("piercing sibilance");
    expect(request.lm_negative_prompt).toContain("robotic phrasing");
    expect(request.lm_negative_prompt).toContain("over-compressed dynamics");
    expect(request.prompt).toContain("precise Mandarin Chinese initials");
    expect(request.prompt).toContain("intimate female vocal");
    expect(request.prompt).toContain("sing only the supplied Mandarin lyrics in exact order");
    expect(request.prompt).not.toContain(`${brief.bpm} BPM`);
    expect(request.prompt).not.toContain(brief.key);
    expect(request.lm_negative_prompt).toContain("mumbled or swallowed lyrics");
    expect(request).toMatchObject({
      vocal_language: "zh",
      shift: 3,
      lm_cfg_scale: 2.4,
    });
  });

  it("keeps natural lyric blending available as a real model setting", () => {
    const request = createAceStepRequest(brief, {
      ...DEFAULT_GENERATION_PREFERENCES,
      lyricClarity: "natural",
    });

    expect(request.prompt).toContain("natural vocal balance");
    expect(request.prompt).not.toContain("precise Mandarin Chinese initials");
    expect(request).toMatchObject({ shift: 1, lm_cfg_scale: 2 });
  });

  it("adds controlled angry-rock performance and anti-harshness guidance", () => {
    const request = createAceStepRequest(brief, {
      ...DEFAULT_GENERATION_PREFERENCES,
      vocalStyle: "male",
      vocalDelivery: "angryRock",
    });

    expect(request.prompt).toContain("controlled rasp and vocal fry");
    expect(request.prompt).toContain("clear lyric articulation");
    expect(request.prompt).toContain("distorted electric guitars");
    expect(request.lm_negative_prompt).toContain("thin shrill screaming");
    expect(request.lm_negative_prompt).toContain("digital clipping");
  });

  it("adds extreme scream and growl without allowing piercing digital noise", () => {
    const request = createAceStepRequest(brief, {
      ...DEFAULT_GENERATION_PREFERENCES,
      vocalDelivery: "extremeScream",
    });

    expect(request.prompt).toContain("controlled scream and deep growl");
    expect(request.prompt).toContain("short shouted hooks");
    expect(request.lm_negative_prompt).toContain("thin high-pitched screech");
    expect(request.lm_negative_prompt).toContain("piercing sustained highs");
    expect(request.lm_negative_prompt).toContain("digital clipping");
  });

  it("uploads style references through the real reference-audio field", () => {
    const reference: GenerationReferenceInput = {
      mode: "style",
      assetId: "ref-1",
      name: "night-reference.wav",
      blob: new Blob(["reference"], { type: "audio/wav" }),
      strength: 0.2,
    };
    const request = createAceStepRequest(
      brief,
      DEFAULT_GENERATION_PREFERENCES,
      reference,
    );
    const form = createAceStepFormData(request, reference);

    expect(request).toMatchObject({
      task_type: "text2music",
      thinking: true,
      audio_cover_strength: 0.2,
    });
    expect(form.get("ref_audio")).toBeInstanceOf(Blob);
    expect(form.get("ctx_audio")).toBeNull();
  });

  it("uploads cover sources through the real source-audio field", () => {
    const reference: GenerationReferenceInput = {
      mode: "cover",
      assetId: "source-1",
      name: "source-song.wav",
      blob: new Blob(["source"], { type: "audio/wav" }),
      strength: 0.68,
    };
    const request = createAceStepRequest(
      brief,
      DEFAULT_GENERATION_PREFERENCES,
      reference,
    );
    const form = createAceStepFormData(request, reference);

    expect(request).toMatchObject({
      task_type: "cover",
      thinking: false,
      audio_cover_strength: 0.68,
    });
    expect(form.get("ctx_audio")).toBeInstanceOf(Blob);
    expect(form.get("ref_audio")).toBeNull();
  });

  it("does not create a fake song when ACE-Step is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      automaticMusicProvider.generate(
        brief,
        { ...DEFAULT_GENERATION_PREFERENCES, duration: 90, variantCount: 2 },
        () => undefined,
      ),
    ).rejects.toThrow("本次没有创建歌曲");
  });

  it("submits a real task, polls it, and returns the generated audio", async () => {
    vi.useFakeTimers();
    const progress: number[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return response({
            code: 200,
            data: { status: "ok", models_initialized: true },
          });
        }
        if (url.endsWith("/release_task")) {
          return response({
            code: 200,
            data: { task_id: "real-task", status: "queued" },
          });
        }
        if (url.endsWith("/query_result")) {
          return response({
            code: 200,
            data: [
              {
                task_id: "real-task",
                status: 1,
                result: JSON.stringify([
                  {
                    file: "/v1/audio?path=generated-a.wav",
                    metas: { duration: 12 },
                    seed_value: "seed-a,seed-b",
                  },
                  {
                    file: "/v1/audio?path=generated-b.wav",
                    metas: { duration: 13 },
                    seed_value: "seed-a,seed-b",
                  },
                ]),
              },
            ],
          });
        }
        if (url.includes("/v1/audio?path=generated-")) {
          return {
            ok: true,
            blob: async () => new Blob(["real-audio"], { type: "audio/wav" }),
          } as Response;
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:real-audio-a")
      .mockReturnValueOnce("blob:real-audio-b");

    const generation = automaticMusicProvider.generate(
      brief,
      { ...DEFAULT_GENERATION_PREFERENCES, variantCount: 2 },
      (event) => progress.push(event.progress),
    );
    await vi.advanceTimersByTimeAsync(2_100);
    const result = await generation;

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      url: "blob:real-audio-a",
      duration: 12,
      provider: "ACE-Step 1.5（本地）",
      costLabel: "本机生成 · 不产生按次 API 费用",
      seed: "seed-a",
    });
    expect(result[1]).toMatchObject({
      url: "blob:real-audio-b",
      duration: 13,
      seed: "seed-b",
    });
    expect(progress.at(-1)).toBe(100);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const releaseCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/release_task"),
    );
    const releasePayload = JSON.parse(
      String((releaseCall?.[1] as RequestInit | undefined)?.body),
    );
    expect(releasePayload).toMatchObject({
      audio_duration: 30,
      batch_size: 2,
      inference_steps: 8,
      lm_temperature: 0.85,
      lm_top_p: 0.9,
      model: "acestep-v15-turbo",
      lm_model_path: "acestep-5Hz-lm-1.7B",
      lm_backend: "mlx",
    });
  });
});

function response(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
