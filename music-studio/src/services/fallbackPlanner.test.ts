import { describe, expect, it } from "vitest";

import { createFallbackPlan } from "./fallbackPlanner";

describe("createFallbackPlan", () => {
  it("turns a night-time idea into a bounded music brief", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt: "写一首凌晨雨夜的中文 R&B，克制一点",
      vocalDelivery: "natural",
      selection: ["主歌人声"],
      currentProject: { bpm: 92, key: "C major", selectedVersion: "v3" },
    });

    expect(plan.brief.bpm).toBe(82);
    expect(plan.brief.language).toBe("中文");
    expect(plan.brief.preserve).toContain("保留已选择片段：主歌人声");
    expect(plan.brief.provider).toBe("自动选择（ACE-Step 优先）");
    expect(plan.source).toBe("local");
  });

  it("turns pasted copy into clear angry-rock lyrics and arrangement", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt:
        "[整首生成] 根据我下面生成的内容，做一首歌。我们已经沉默太久，这一次绝不退后。",
      vocalDelivery: "angryRock",
      selection: [],
      currentProject: { bpm: 92, key: "C major", selectedVersion: "v3" },
    });

    expect(plan.brief).toMatchObject({
      title: "不再低头",
      genre: "Alternative Hard Rock",
      bpm: 132,
    });
    expect(plan.brief.summary).toContain("我们已经沉默太久");
    expect(plan.brief.vocalMode).toContain("怒声摇滚");
    expect(plan.brief.instruments).toContain("失真电吉他");
    expect(plan.brief.lyrics).toContain("我也要逆着风怒吼");
  });

  it("uses shorter hooks for extreme screams", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt: "把压抑和愤怒全部喊出来",
      vocalDelivery: "extremeScream",
      selection: [],
      currentProject: { bpm: 92, key: "C major", selectedVersion: "v3" },
    });

    expect(plan.brief.genre).toBe("Modern Metalcore");
    expect(plan.brief.vocalMode).toContain("scream / growl");
    expect(plan.brief.lyrics).toContain("现在——怒吼");
    expect(plan.brief.lyrics.every((line) => line.length <= 18)).toBe(true);
  });

  it("compresses long sports copy into a coherent, singable full-song draft", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt: "把法甲这段巴黎对里尔的评论写成歌，巴黎要冲欧冠三连冠，里尔卖掉1亿欧核心，巴黎今晚必须发力。",
      vocalDelivery: "angryRock",
      selection: [],
      currentProject: { bpm: 92, key: "A minor", selectedVersion: "v3" },
    });
    expect(plan.brief.lyrics.length).toBeGreaterThanOrEqual(10);
    expect(plan.brief.lyrics.length).toBeLessThanOrEqual(13);
    expect(plan.brief.lyrics.join("\n")).toContain("因为已有5支球队拿三分");
    expect(plan.brief.lyrics.at(-1)).toBe("这里还是七姐聊球");
  });

  it("honors a novice's selected lyric writing route", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt: "原始创意：把聊天记录唱出来\n歌词写法：对话体",
      vocalDelivery: "natural",
      selection: [],
      currentProject: { bpm: 92, key: "C major", selectedVersion: "v3" },
    });

    expect(plan.brief.lyrics[0]).toMatch(/^你说/);
    expect(plan.brief.lyrics.some((line) => line.includes("正在输入"))).toBe(true);
  });
});
