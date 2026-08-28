import { describe, expect, it } from "vitest";

import { recommendLyricWritingStyles } from "./lyricWritingStyles";

describe("lyric writing style recommendations", () => {
  it("recommends dialogue for chat-record material", () => {
    const styles = recommendLyricWritingStyles({
      idea: "把一段微信聊天记录唱出来，像两个人在说话",
    });
    expect(styles[0].id).toBe("dialogue");
    expect(styles[0].recommended).toBe(true);
  });

  it("recommends short hooks for angry rock", () => {
    const styles = recommendLyricWritingStyles({
      idea: "中文摇滚，副歌怒音爆发，咬字清楚",
    });
    expect(styles[0].id).toBe("hook");
    expect(styles).toHaveLength(5);
    expect(styles.filter((style) => style.recommended)).toHaveLength(3);
  });
});
