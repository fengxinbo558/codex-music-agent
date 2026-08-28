import { describe, expect, it } from "vitest";

import {
  calculatePeakGain,
  encodeAudioBufferToWav,
  measureAudioPeak,
  readWavSampleRate,
  resolveMasteringSettings,
} from "./audioMastering";

function audioBuffer(channels: number[][], sampleRate = 48_000) {
  const data = channels.map((channel) => Float32Array.from(channel));
  return {
    numberOfChannels: data.length,
    length: data[0].length,
    sampleRate,
    duration: data[0].length / sampleRate,
    getChannelData: (channel: number) => data[channel],
  };
}

describe("audio mastering", () => {
  it("measures finite peaks and ignores invalid samples", () => {
    const buffer = audioBuffer([
      [0, 0.25, -0.75],
      [Number.NaN, Number.POSITIVE_INFINITY, 0.5],
    ]);

    expect(measureAudioPeak(buffer)).toBe(0.75);
  });

  it("only turns down audio that exceeds the target peak", () => {
    expect(calculatePeakGain(0.5, -1)).toBe(1);
    expect(calculatePeakGain(1, -1)).toBeCloseTo(0.89125, 4);
    expect(calculatePeakGain(0, -1)).toBe(1);
  });

  it("encodes a valid stereo PCM WAV with sanitized samples", async () => {
    const wav = encodeAudioBufferToWav(
      audioBuffer([
        [0, 1, -1],
        [Number.NaN, 0.5, -0.5],
      ]),
      0.5,
    );
    const bytes = await wav.arrayBuffer();
    const view = new DataView(bytes);
    const ascii = (offset: number, length: number) =>
      String.fromCharCode(
        ...Array.from({ length }, (_, index) => view.getUint8(offset + index)),
      );

    expect(wav.type).toBe("audio/wav");
    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(36, 4)).toBe("data");
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(12);
    expect(bytes.byteLength).toBe(56);
    expect(view.getInt16(46, true)).toBe(0);
    expect(readWavSampleRate(bytes)).toBe(48_000);
  });

  it("reads the original WAV sample rate before browser decoding", async () => {
    const wav = encodeAudioBufferToWav(audioBuffer([[0, 0]], 44_100));

    expect(readWavSampleRate(await wav.arrayBuffer())).toBe(44_100);
    expect(readWavSampleRate(new ArrayBuffer(16))).toBeUndefined();
  });

  it("protects Mandarin lyric presence while still softening harsh highs", () => {
    const natural = resolveMasteringSettings("warm", "natural");
    const clear = resolveMasteringSettings("warm", "clear");

    expect(clear.presence.gain).toBeGreaterThan(natural.presence.gain);
    expect(clear.highShelf.gain).toBeGreaterThan(natural.highShelf.gain);
    expect(clear.highShelf.gain).toBeLessThan(0);
    expect(clear.compressor.ratio).toBeLessThan(natural.compressor.ratio);
  });
});
