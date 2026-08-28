import type {
  GenerationTask,
  ModelConnection,
  MusicAsset,
  ProjectSummary,
} from "../types";

export const recentProjects: ProjectSummary[] = [
  {
    id: "rain-before-it-stops",
    title: "雨停以前",
    genre: "Alternative R&B",
    status: "ready",
    updatedAt: "刚刚编辑",
    bpm: 92,
    musicKey: "C major",
    duration: "01:36",
    accent: "#dba35d",
  },
  {
    id: "neon-tide",
    title: "霓虹潮汐",
    genre: "City Pop",
    status: "draft",
    updatedAt: "昨天 22:18",
    bpm: 108,
    musicKey: "A minor",
    duration: "02:14",
    accent: "#a98ad1",
  },
  {
    id: "blank-platform",
    title: "空站台",
    genre: "Indie Folk",
    status: "draft",
    updatedAt: "8 月 25 日",
    bpm: 76,
    musicKey: "G major",
    duration: "00:48",
    accent: "#72c9ae",
  },
];

export const projectTemplates = [
  {
    id: "idea",
    name: "从一句想法开始",
    description: "Agent 先整理故事、曲风与结构",
    glyph: "✦",
  },
  {
    id: "reference",
    name: "从参考音频开始",
    description: "分析氛围、速度和配器方向",
    glyph: "≋",
  },
  {
    id: "vocal",
    name: "从人声小样开始",
    description: "围绕旋律生成伴奏和编曲",
    glyph: "◉",
  },
];

// The real library starts empty and is hydrated from IndexedDB. Keeping
// unplayable demo rows here made the product look complete while doing nothing.
export const initialAssets: MusicAsset[] = [];

export const modelConnections: ModelConnection[] = [
  {
    id: "codex",
    name: "Codex Agent",
    role: "agent",
    status: "connected",
    runtime: "本地 Agent 进程",
    note: "理解需求、读取工程状态、制定制作计划并调用工具。",
    capabilities: ["意图理解", "编曲规划", "工具调度", "版本说明"],
  },
  {
    id: "prototype",
    name: "Prototype Synth",
    role: "music",
    status: "ready",
    runtime: "浏览器本地",
    note: "用于验证从 Agent 计划到可播放 WAV 的完整链路，不代表正式音乐质量。",
    capabilities: ["快速试听", "WAV 输出", "多轨演示"],
  },
  {
    id: "ace-step",
    name: "ACE-Step",
    role: "music",
    status: "not-installed",
    runtime: "建议本地 GPU",
    note: "计划中的主要音乐生成引擎，可替换 Prototype Synth。",
    capabilities: ["整曲生成", "歌词演唱", "风格控制", "局部重绘"],
  },
  {
    id: "demucs",
    name: "Demucs",
    role: "audio",
    status: "not-installed",
    runtime: "本地",
    note: "可选的音轨分离与参考音频处理工具。",
    capabilities: ["人声分离", "伴奏分离", "Stem 导出"],
  },
  {
    id: "funmusic",
    name: "FunMusic Cloud",
    role: "music",
    status: "unconfigured",
    runtime: "云端 API",
    note: "可选云端音乐服务；只有配置密钥后才会产生调用费用。",
    capabilities: ["云端生成", "弹性算力", "备用引擎"],
  },
  {
    id: "speech",
    name: "System Speech",
    role: "input",
    status: "ready",
    runtime: "操作系统能力",
    note: "把口述的创作想法转换为文字，不负责合成人声。",
    capabilities: ["中文听写", "免模型配置"],
  },
];

export const initialTasks: GenerationTask[] = [
  {
    id: "task-1",
    title: "重做副歌编曲",
    status: "complete",
    time: "刚刚",
    detail: "版本 03 · Prototype Synth",
  },
  {
    id: "task-2",
    title: "分析雨夜参考音频",
    status: "complete",
    time: "12 分钟前",
    detail: "BPM 92 · C major",
  },
  {
    id: "task-3",
    title: "生成主歌歌词草案",
    status: "complete",
    time: "28 分钟前",
    detail: "Codex Agent",
  },
];
