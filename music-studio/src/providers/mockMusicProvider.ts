import type {
  GeneratedAudio,
  GenerationPreferences,
  GenerationReferenceInput,
  MusicBrief,
  MusicTrack,
} from "../types";

export type GenerationProgress = {
  progress: number;
  label: string;
  stage?:
    | "model_submitting"
    | "model_accepted"
    | "model_running"
    | "audio_received";
};

export interface MusicProvider {
  id: string;
  name: string;
  generate(
    brief: MusicBrief,
    preferences: GenerationPreferences,
    onProgress: (event: GenerationProgress) => void,
    reference?: GenerationReferenceInput,
  ): Promise<GeneratedAudio[]>;
}

const SAMPLE_RATE = 22_050;
const DURATION_SECONDS = 16;

export const mockMusicProvider: MusicProvider = {
  id: "mock-local",
  name: "本地原型合成器",
  async generate(brief, _preferences, onProgress, _reference) {
    const phases: GenerationProgress[] = [
      { progress: 12, label: "整理段落与和弦" },
      { progress: 31, label: "生成鼓组和低频" },
      { progress: 55, label: "铺设主旋律与质感" },
      { progress: 78, label: "混合各音乐层" },
      { progress: 94, label: "整理成可播放版本" },
    ];

    for (const phase of phases) {
      await delay(260);
      onProgress(phase);
    }

    const pcm = synthesizePreview(brief, DURATION_SECONDS, SAMPLE_RATE);
    const wav = encodeWav(pcm, SAMPLE_RATE);
    const blob = new Blob([wav], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    onProgress({ progress: 100, label: "新版本已就绪" });

    return [
      {
        url,
        blob,
        duration: DURATION_SECONDS,
        tracks: [],
        provider: "Prototype Synth（链路演示）",
        costLabel: "浏览器本地演示 · 不产生按次 API 费用",
        warning:
          "ACE-Step 当前未启动，链路试听固定为 16 秒、1 个版本，不是真实 AI 歌曲。",
      },
    ];
  },
};

function synthesizePreview(
  brief: MusicBrief,
  seconds: number,
  sampleRate: number,
) {
  const samples = new Float32Array(seconds * sampleRate);
  const beatLength = (60 / Math.max(60, Math.min(160, brief.bpm))) * sampleRate;
  const chordRoots = [146.83, 174.61, 220, 196];
  let noiseState = hashString(brief.title) || 1;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const beatPosition = index % beatLength;
    const beat = Math.floor(index / beatLength);
    const chordIndex = Math.floor(beat / 4) % chordRoots.length;
    const root = chordRoots[chordIndex];
    const fadeIn = Math.min(1, time / 1.2);
    const fadeOut = Math.min(1, (seconds - time) / 1.4);
    const envelope = Math.max(0, fadeIn * fadeOut);
    const pad =
      Math.sin(time * root * Math.PI * 2) * 0.12 +
      Math.sin(time * root * 1.5 * Math.PI * 2) * 0.065 +
      Math.sin(time * root * 2 * Math.PI * 2) * 0.035;
    const melodyStep = [0, 3, 7, 10, 7, 5, 3, 0][beat % 8];
    const melodyFrequency = root * 2 ** (melodyStep / 12);
    const melodyEnvelope = Math.exp(-beatPosition / (beatLength * 0.78));
    const melody =
      Math.sin(time * melodyFrequency * Math.PI * 2) * melodyEnvelope * 0.1;
    const kickEnvelope = Math.exp(-beatPosition / (sampleRate * 0.09));
    const kick = Math.sin(time * 54 * Math.PI * 2) * kickEnvelope * 0.24;
    const snareBeat = beat % 4 === 1 || beat % 4 === 3;
    noiseState = (noiseState * 16_807) % 2_147_483_647;
    const noise = noiseState / 2_147_483_647 - 0.5;
    const snare = snareBeat
      ? noise * Math.exp(-beatPosition / (sampleRate * 0.055)) * 0.12
      : 0;
    samples[index] = Math.tanh((pad + melody + kick + snare) * envelope * 1.3);
  }

  return samples;
}

export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
  }

  return buffer;
}

export function createGeneratedTracks(brief: MusicBrief): MusicTrack[] {
  const colors = ["#f0a6c7", "#d9a35d", "#79c9bb", "#8191d6"];
  const names = ["主旋律", brief.instruments[0] ?? "和弦", "节奏", "氛围层"];
  const kinds: MusicTrack["kind"][] = [
    "vocal",
    "instrument",
    "drums",
    "texture",
  ];

  return names.map((name, index) => ({
    id: `generated-${index}`,
    name,
    kind: kinds[index],
    color: colors[index],
    muted: false,
    solo: false,
    locked: false,
    volume: [84, 76, 70, 52][index],
    pan: [0, -8, 0, 16][index],
    clips:
      index === 0
        ? [
            createGeneratedClip(
              "generated-verse",
              `${brief.title} · 主歌`,
              10,
              38,
              "verse",
              index,
            ),
            createGeneratedClip(
              "generated-chorus",
              `${brief.title} · 副歌`,
              48,
              32,
              "chorus",
              index + 2,
            ),
          ]
        : [
            createGeneratedClip(
              `generated-clip-${index}`,
              name,
              0,
              96,
              index === 1 ? "chorus" : "intro",
              index,
            ),
          ],
  }));
}

function createGeneratedClip(
  id: string,
  name: string,
  start: number,
  duration: number,
  sectionId: string,
  variation: number,
) {
  return {
    id,
    name,
    start,
    duration,
    sectionId,
    emphasis: Array.from({ length: Math.max(26, duration - 4) }, (_, point) =>
      Number(
        (0.2 + Math.abs(Math.sin(point * 1.31 + variation)) * 0.68).toFixed(2),
      ),
    ),
  };
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }, 7);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
