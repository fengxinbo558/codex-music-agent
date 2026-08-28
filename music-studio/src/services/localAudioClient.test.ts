import { describe, expect, it, vi } from "vitest";

import { LocalAudioClient } from "./localAudioClient";

describe("LocalAudioClient", () => {
  it("submits a real blob and returns a registered job", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      return Response.json({
        id: "job-1",
        kind: "stems",
        status: "queued",
        progress: 0,
        label: "等待处理",
        asset_ids: [],
        error: null,
      });
    }) as unknown as typeof fetch;
    const client = new LocalAudioClient("http://local.test", fetcher);
    const job = await client.submitStems(
      new Blob(["wav"], { type: "audio/wav" }),
      "song.wav",
    );
    expect(job.id).toBe("job-1");
  });

  it("polls until assets are ready", async () => {
    let call = 0;
    const fetcher = vi.fn(async () => {
      call += 1;
      return Response.json({
        id: "job-2",
        kind: "stems",
        status: call === 1 ? "running" : "ready",
        progress: call === 1 ? 45 : 100,
        label: call === 1 ? "正在分轨" : "处理完成",
        asset_ids: call === 1 ? [] : ["v", "d", "b", "o"],
        error: null,
      });
    }) as unknown as typeof fetch;
    const client = new LocalAudioClient("http://local.test", fetcher);
    const progress: number[] = [];
    vi.useFakeTimers();
    const waiting = client.waitForJob("job-2", (job) => progress.push(job.progress));
    await vi.advanceTimersByTimeAsync(1_500);
    const job = await waiting;
    vi.useRealTimers();
    expect(job.asset_ids).toEqual(["v", "d", "b", "o"]);
    expect(progress).toEqual([45, 100]);
  });

  it("submits four named stems for a real remix", async () => {
    const fetcher = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const form = init?.body as FormData;
        expect([...form.keys()]).toEqual(["vocals", "drums", "bass", "other"]);
        return Response.json({
          id: "job-mix",
          kind: "stem-mix",
          status: "queued",
          progress: 0,
          label: "等待处理",
          asset_ids: [],
          error: null,
        });
      },
    ) as unknown as typeof fetch;
    const client = new LocalAudioClient("http://local.test", fetcher);
    const audio = new Blob(["wav"], { type: "audio/wav" });
    const job = await client.mixStems({
      vocals: audio,
      drums: audio,
      bass: audio,
      other: audio,
    });
    expect(job.id).toBe("job-mix");
  });
});
