import { describe, expect, it } from "vitest";

import {
  appendIdeaInspiration,
  createIdeaInspirations,
} from "./ideaInspiration";

describe("idea inspiration", () => {
  it("prioritizes missing creative dimensions for a vague idea", () => {
    const ideas = createIdeaInspirations("想写一首摇滚歌");
    expect(ideas).toHaveLength(4);
    expect(ideas.map((item) => item.id)).toContain("scene");
    expect(ideas.map((item) => item.id)).toContain("relationship");
    expect(ideas.find((item) => item.id === "hook")?.suggestion).toContain("沉默");
  });

  it("appends a selected reference without replacing the user's words", () => {
    expect(
      appendIdeaInspiration("写一首夜里听的歌", "唱给一个已经走远的人"),
    ).toBe("写一首夜里听的歌；唱给一个已经走远的人");
  });
});
