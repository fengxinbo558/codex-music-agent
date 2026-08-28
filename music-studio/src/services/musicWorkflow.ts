import type {
  LyricCue,
  MusicWorkflow,
  MusicWorkflowStep,
  WorkflowStepId,
} from "../types";

const WORKFLOW_DEFINITIONS: Array<
  Pick<MusicWorkflowStep, "id" | "kind" | "owner" | "title" | "output">
> = [
  {
    id: "director",
    kind: "agent",
    owner: "音乐总监",
    title: "理解创意并确定制作方向",
    output: "歌曲标题、曲风、情绪、速度与调性",
  },
  {
    id: "lyrics",
    kind: "agent",
    owner: "作词人",
    title: "整理可演唱的歌词",
    output: "逐行歌词与段落结构",
  },
  {
    id: "arrangement",
    kind: "agent",
    owner: "编曲师",
    title: "设计歌曲结构与配器",
    output: "段落、乐器与情绪推进",
  },
  {
    id: "vocal",
    kind: "agent",
    owner: "演唱指导",
    title: "确定唱法与咬字",
    output: "人声、情绪强度与歌词清晰度",
  },
  {
    id: "model",
    kind: "tool",
    owner: "ACE-Step 音乐模型",
    title: "生成真实歌曲音频",
    output: "可播放 WAV 与生成种子",
  },
  {
    id: "master",
    kind: "agent",
    owner: "混音与母带师",
    title: "控制尖锐感并保留人声清晰度",
    output: "模型原声与优化版本",
  },
  {
    id: "lyricTiming",
    kind: "agent",
    owner: "歌词同步师",
    title: "建立播放歌词时间轴",
    output: "可点击、随播放高亮的逐句歌词",
  },
  {
    id: "quality",
    kind: "agent",
    owner: "质检师",
    title: "核验结果是否真的可交付",
    output: "音频、保存、歌词与版本完整性检查",
  },
];

export function createIdleWorkflow(): MusicWorkflow {
  return {
    runId: null,
    status: "idle",
    steps: WORKFLOW_DEFINITIONS.map((step) => ({
      ...step,
      status: "pending",
    })),
  };
}

export function startWorkflow(runId: string): MusicWorkflow {
  return activateWorkflowStep(
    { ...createIdleWorkflow(), runId, status: "running" },
    "director",
  );
}

export function activateWorkflowStep(
  workflow: MusicWorkflow,
  stepId: WorkflowStepId,
  evidence?: string,
): MusicWorkflow {
  return {
    ...workflow,
    status: "running",
    steps: workflow.steps.map((step) => ({
      ...step,
      status:
        step.id === stepId
          ? "active"
          : step.status === "active"
            ? "complete"
            : step.status,
      evidence: step.id === stepId && evidence ? evidence : step.evidence,
    })),
  };
}

export function completeWorkflowStep(
  workflow: MusicWorkflow,
  stepId: WorkflowStepId,
  evidence: string,
): MusicWorkflow {
  return {
    ...workflow,
    steps: workflow.steps.map((step) =>
      step.id === stepId ? { ...step, status: "complete", evidence } : step,
    ),
  };
}

export function failActiveWorkflow(
  workflow: MusicWorkflow,
  evidence: string,
): MusicWorkflow {
  return {
    ...workflow,
    status: "failed",
    steps: workflow.steps.map((step) =>
      step.status === "active" ? { ...step, status: "failed", evidence } : step,
    ),
  };
}

export function completeWorkflow(workflow: MusicWorkflow): MusicWorkflow {
  return {
    ...workflow,
    status: "complete",
    steps: workflow.steps.map((step) =>
      step.status === "active" ? { ...step, status: "complete" } : step,
    ),
  };
}

export function evaluateDeliveryGate(input: {
  versionId?: string;
  audioAssetId?: string;
  audioSaved: boolean;
  duration: number;
  hasVocals: boolean;
  lyrics: string[];
  lyricCues: LyricCue[];
}) {
  const checks = [
    { label: "新版本已建立", pass: Boolean(input.versionId) },
    {
      label: "真实音频已保存",
      pass: Boolean(input.audioAssetId) && input.audioSaved,
    },
    { label: "音频时长有效", pass: input.duration > 1 },
    {
      label: "演唱歌词完整",
      pass:
        !input.hasVocals ||
        (input.lyrics.some((line) => line.trim()) &&
          input.lyricCues.length > 0),
    },
  ];
  return { ready: checks.every((check) => check.pass), checks };
}
