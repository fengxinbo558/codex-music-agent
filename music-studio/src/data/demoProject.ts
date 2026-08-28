import type { MusicSection, MusicTrack, ProjectVersion } from "../types";

export const PROJECT_DURATION = 96;

export const sections: MusicSection[] = [
  { id: "intro", name: "前奏", start: 0, duration: 12 },
  { id: "verse", name: "主歌", start: 12, duration: 24 },
  { id: "pre", name: "预副歌", start: 36, duration: 12 },
  { id: "chorus", name: "副歌", start: 48, duration: 24 },
  { id: "outro", name: "尾奏", start: 72, duration: 24 },
];

const makeEmphasis = (seed: number, count = 34) =>
  Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 1.73 + seed) * 0.22;
    const pulse = ((index * 7 + seed * 11) % 17) / 24;
    return Number(Math.min(0.95, 0.18 + Math.abs(wave) + pulse).toFixed(2));
  });

export const initialTracks: MusicTrack[] = [
  {
    id: "lead",
    name: "主唱",
    kind: "vocal",
    color: "#f0a6c7",
    muted: false,
    solo: false,
    locked: false,
    volume: 84,
    pan: 0,
    clips: [
      {
        id: "lead-verse",
        name: "主歌人声",
        start: 12,
        duration: 36,
        sectionId: "verse",
        emphasis: makeEmphasis(2, 42),
      },
      {
        id: "lead-chorus",
        name: "副歌人声",
        start: 48,
        duration: 24,
        sectionId: "chorus",
        emphasis: makeEmphasis(7, 30),
      },
    ],
  },
  {
    id: "harmony",
    name: "和声",
    kind: "vocal",
    color: "#ba8bd6",
    muted: false,
    solo: false,
    locked: false,
    volume: 66,
    pan: 14,
    clips: [
      {
        id: "harmony-chorus",
        name: "叠唱",
        start: 48,
        duration: 24,
        sectionId: "chorus",
        emphasis: makeEmphasis(9, 28),
      },
    ],
  },
  {
    id: "guitar",
    name: "木吉他",
    kind: "instrument",
    color: "#d9a35d",
    muted: false,
    solo: false,
    locked: false,
    volume: 78,
    pan: -8,
    clips: [
      {
        id: "guitar-full",
        name: "指弹节奏",
        start: 0,
        duration: 96,
        sectionId: "intro",
        emphasis: makeEmphasis(4, 92),
      },
    ],
  },
  {
    id: "drums",
    name: "鼓组",
    kind: "drums",
    color: "#79c9bb",
    muted: false,
    solo: false,
    locked: false,
    volume: 72,
    pan: 0,
    clips: [
      {
        id: "drums-main",
        name: "松弛鼓组",
        start: 30,
        duration: 66,
        sectionId: "pre",
        emphasis: makeEmphasis(12, 68),
      },
    ],
  },
  {
    id: "texture",
    name: "氛围",
    kind: "texture",
    color: "#8191d6",
    muted: false,
    solo: false,
    locked: false,
    volume: 54,
    pan: -18,
    clips: [
      {
        id: "texture-bed",
        name: "雨夜底噪",
        start: 0,
        duration: 96,
        sectionId: "intro",
        emphasis: makeEmphasis(15, 88),
      },
    ],
  },
];

export const initialVersions: ProjectVersion[] = [
  {
    id: "v3",
    label: "版本 03",
    createdAt: "刚刚",
    note: "副歌进入更早，保留主歌人声",
    source: "demo",
  },
  {
    id: "v2",
    label: "版本 02",
    createdAt: "12 分钟前",
    note: "加入松弛鼓组与和声层",
    source: "demo",
  },
  {
    id: "v1",
    label: "版本 01",
    createdAt: "28 分钟前",
    note: "最初草稿",
    source: "demo",
  },
];

export const initialLyrics = [
  "城市把晚风折进衣角",
  "车窗里的人各自沉默",
  "我把没说完的话唱得很轻",
  "等一场雨替我们经过",
];
