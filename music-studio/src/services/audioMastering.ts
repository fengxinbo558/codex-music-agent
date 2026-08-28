import { TONE_PROFILES, type MasteringProfile } from "../data/toneProfiles";
import type { LyricClarity, ToneProfile } from "../types";

type AudioBufferShape = Pick<
  AudioBuffer,
  "numberOfChannels" | "length" | "sampleRate" | "duration" | "getChannelData"
>;

export type AudioMasteringReport = {
  profile: ToneProfile;
  duration: number;
  channels: number;
  sampleRate: number;
  renderedPeak: number;
  outputPeak: number;
  peakGainDb: number;
  lyricClarity: LyricClarity;
};

export type AudioMasteringResult = {
  blob: Blob;
  report: AudioMasteringReport;
};

export async function masterAudioBlob(
  blob: Blob,
  profile: ToneProfile,
  lyricClarity: LyricClarity = "natural",
): Promise<AudioMasteringResult> {
  if (!blob.type.startsWith("audio/")) {
    throw new Error("只有真实音频文件可以进行柔化处理。");
  }
  const AudioContextConstructor = window.AudioContext;
  const OfflineAudioContextConstructor = window.OfflineAudioContext;
  if (!AudioContextConstructor || !OfflineAudioContextConstructor) {
    throw new Error("当前环境不支持本机音频柔化，原声仍然可以使用。");
  }

  const encodedAudio = await blob.arrayBuffer();
  const sourceSampleRate = readWavSampleRate(encodedAudio);
  const decodingContext = new AudioContextConstructor(
    sourceSampleRate ? { sampleRate: sourceSampleRate } : undefined,
  );
  try {
    const decoded = await decodingContext.decodeAudioData(encodedAudio);
    const channelCount = Math.max(1, Math.min(2, decoded.numberOfChannels));
    const offline = new OfflineAudioContextConstructor(
      channelCount,
      decoded.length,
      decoded.sampleRate,
    );
    const sourceBuffer = offline.createBuffer(
      channelCount,
      decoded.length,
      decoded.sampleRate,
    );
    for (let channel = 0; channel < channelCount; channel += 1) {
      sourceBuffer.copyToChannel(decoded.getChannelData(channel), channel);
    }

    const settings = resolveMasteringSettings(profile, lyricClarity);
    const source = offline.createBufferSource();
    source.buffer = sourceBuffer;

    const warmth = offline.createBiquadFilter();
    warmth.type = "peaking";
    warmth.frequency.value = settings.warmth.frequency;
    warmth.gain.value = settings.warmth.gain;
    warmth.Q.value = settings.warmth.q;

    const presence = offline.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = settings.presence.frequency;
    presence.gain.value = settings.presence.gain;
    presence.Q.value = settings.presence.q;

    const highShelf = offline.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = settings.highShelf.frequency;
    highShelf.gain.value = settings.highShelf.gain;

    const compressor = offline.createDynamicsCompressor();
    compressor.threshold.value = settings.compressor.threshold;
    compressor.knee.value = settings.compressor.knee;
    compressor.ratio.value = settings.compressor.ratio;
    compressor.attack.value = settings.compressor.attack;
    compressor.release.value = settings.compressor.release;

    source
      .connect(warmth)
      .connect(presence)
      .connect(highShelf)
      .connect(compressor)
      .connect(offline.destination);
    source.start(0);

    const rendered = await offline.startRendering();
    const renderedPeak = measureAudioPeak(rendered);
    const peakGain = calculatePeakGain(renderedPeak, settings.targetPeakDb);
    const outputPeak = renderedPeak * peakGain;
    return {
      blob: encodeAudioBufferToWav(rendered, peakGain),
      report: {
        profile,
        duration: rendered.duration,
        channels: rendered.numberOfChannels,
        sampleRate: rendered.sampleRate,
        renderedPeak,
        outputPeak,
        peakGainDb: gainToDecibels(peakGain),
        lyricClarity,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("原声仍然可以使用")) {
      throw error;
    }
    throw new Error("音频柔化没有完成，原声已经保留，可以稍后重试。");
  } finally {
    await decodingContext.close();
  }
}

export function resolveMasteringSettings(
  profile: ToneProfile,
  lyricClarity: LyricClarity,
): MasteringProfile {
  const base = TONE_PROFILES[profile].mastering;
  if (lyricClarity !== "clear") return base;
  return {
    ...base,
    presence: {
      ...base.presence,
      gain: Math.max(base.presence.gain, -0.35),
    },
    highShelf: {
      ...base.highShelf,
      gain: Math.max(base.highShelf.gain, -1.35),
    },
    compressor: {
      ...base.compressor,
      ratio: Math.min(base.compressor.ratio, 1.85),
    },
  };
}

export function measureAudioPeak(buffer: AudioBufferShape) {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      if (Number.isFinite(sample)) peak = Math.max(peak, Math.abs(sample));
    }
  }
  return peak;
}

export function calculatePeakGain(peak: number, targetPeakDb = -1) {
  if (!Number.isFinite(peak) || peak <= 0) return 1;
  const target = 10 ** (targetPeakDb / 20);
  return Math.min(1, target / peak);
}

export function readWavSampleRate(value: ArrayBuffer) {
  if (value.byteLength < 28) return undefined;
  const view = new DataView(value);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    return undefined;
  }
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    if (id === "fmt " && chunkSize >= 16 && offset + 24 <= view.byteLength) {
      const sampleRate = view.getUint32(offset + 12, true);
      return sampleRate >= 8_000 && sampleRate <= 384_000
        ? sampleRate
        : undefined;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return undefined;
}

export function encodeAudioBufferToWav(buffer: AudioBufferShape, gain = 1) {
  const channelCount = Math.max(1, Math.min(2, buffer.numberOfChannels));
  const bytesPerSample = 2;
  const frameSize = channelCount * bytesPerSample;
  const dataSize = buffer.length * frameSize;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * frameSize, true);
  view.setUint16(32, frameSize, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const raw = channels[channel][frame] * gain;
      const finite = Number.isFinite(raw) ? raw : 0;
      const sample = Math.max(-1, Math.min(1, finite));
      view.setInt16(
        offset,
        sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff),
        true,
      );
      offset += bytesPerSample;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function gainToDecibels(gain: number) {
  return gain > 0 ? 20 * Math.log10(gain) : Number.NEGATIVE_INFINITY;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function readAscii(view: DataView, offset: number, length: number) {
  if (offset + length > view.byteLength) return "";
  return String.fromCharCode(
    ...Array.from({ length }, (_, index) => view.getUint8(offset + index)),
  );
}
