import type { MusicSection, MusicTrack, ProjectVersion } from "../types";

export const PROJECT_DURATION = 96;

export const sections: MusicSection[] = [
  { id: "intro", name: "前奏", start: 0, duration: 12 },
  { id: "verse", name: "主歌", start: 12, duration: 24 },
  { id: "pre", name: "预副歌", start: 36, duration: 12 },
  { id: "chorus", name: "副歌", start: 48, duration: 24 },
  { id: "outro", name: "尾奏", start: 72, duration: 24 },
];

// A track appears only after a real stem asset exists. The initial project has
// no decorative multi-track data.
export const initialTracks: MusicTrack[] = [];

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
