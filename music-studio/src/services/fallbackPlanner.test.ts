import { describe, expect, it } from "vitest";

import { createFallbackPlan } from "./fallbackPlanner";

describe("createFallbackPlan", () => {
  it("turns a night-time idea into a bounded music brief", () => {
    const plan = createFallbackPlan({
      projectId: "demo",
      prompt: "写一首凌晨雨夜的中文 R&B，克制一点",
      selection: ["主歌人声"],
      currentProject: { bpm: 92, key: "C major", selectedVersion: "v3" },
    });

    expect(plan.brief.bpm).toBe(82);
    expect(plan.brief.language).toBe("中文");
    expect(plan.brief.preserve).toContain("保留已选择片段：主歌人声");
    expect(plan.brief.provider).toBe("自动选择（ACE-Step 优先）");
    expect(plan.source).toBe("local");
  });
});
