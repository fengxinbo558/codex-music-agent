import { describe, expect, it } from "vitest";

import { encodeWav } from "./mockMusicProvider";

describe("encodeWav", () => {
  it("writes a valid mono PCM wave header", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5]), 22_050);
    const bytes = new Uint8Array(wav);
    const text = (start: number, length: number) =>
      String.fromCharCode(...bytes.slice(start, start + length));

    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(text(36, 4)).toBe("data");
    expect(wav.byteLength).toBe(50);
  });
});
