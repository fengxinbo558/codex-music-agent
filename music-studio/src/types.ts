export type AgentState =
  | "idle"
  | "thinking"
  | "rendering"
  | "complete"
  | "error";

export type TrackKind = "vocal" | "instrument" | "drums" | "texture";

export type AppView = "projects" | "studio" | "library" | "models";

export type AudioVariant = "source" | "optimized";

export type StudioBottomTab = "lyrics" | "mixer" | "versions" | "tasks";

export type GenerationMode = "full" | "region" | "extend" | "rearrange";

export type GenerationDuration = 30 | 60 | 90;

export type VocalStyle = "female" | "male" | "instrumental";

export type VocalDelivery = "natural" | "angryRock" | "extremeScream";

export type LyricClarity = "natural" | "clear";

export type LyricsMode = "auto" | "current";

export type CreativityLevel = "stable" | "balanced" | "surprise";

export type ToneProfile = "warm" | "natural" | "bright";

export type ReferenceMode = "none" | "style" | "cover";

export type GenerationReferenceSettings = {
  mode: ReferenceMode;
  assetId: string;
  strength: number;
};

export type GenerationReferenceInput = {
  mode: Exclude<ReferenceMode, "none">;
  assetId: string;
  name: string;
  blob: Blob;
  strength: number;
};

export type GenerationPreferences = {
  duration: GenerationDuration;
  vocalStyle: VocalStyle;
  vocalDelivery: VocalDelivery;
  lyricClarity: LyricClarity;
  lyricsMode: LyricsMode;
  creativity: CreativityLevel;
  variantCount: 1 | 2;
  toneProfile: ToneProfile;
};

export type LyricCue = {
  id: string;
  text: string;
  start: number;
  end: number;
  source: "estimated" | "aligned";
};

export type WorkflowStepId =
  | "director"
  | "lyrics"
  | "arrangement"
  | "vocal"
  | "model"
  | "master"
  | "lyricTiming"
  | "quality";

export type WorkflowStepStatus = "pending" | "active" | "complete" | "failed";

export type MusicWorkflowStep = {
  id: WorkflowStepId;
  kind: "agent" | "tool";
  owner: string;
  title: string;
  output: string;
  status: WorkflowStepStatus;
  evidence?: string;
};

export type MusicWorkflow = {
  runId: string | null;
  status: "idle" | "running" | "complete" | "failed";
  steps: MusicWorkflowStep[];
};

export type DialogKind =
  | "new-project"
  | "export"
  | "compare"
  | "install-plan"
  | "notifications"
  | null;

export type MusicSection = {
  id: string;
  name: string;
  start: number;
  duration: number;
};

export type MusicClip = {
  id: string;
  name: string;
  start: number;
  duration: number;
  sectionId: string;
  emphasis: number[];
};

export type MusicTrack = {
  id: string;
  name: string;
  kind: TrackKind;
  color: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  volume: number;
  pan: number;
  clips: MusicClip[];
};

export type ProjectVersion = {
  id: string;
  label: string;
  createdAt: string;
  note: string;
  source: "demo" | "generated";
  provider?: string;
  bpm?: number;
  musicKey?: string;
  duration?: number;
  audioUrl?: string;
  audioAssetId?: string;
  prompt?: string;
  preferences?: GenerationPreferences;
  lyrics?: string[];
  lyricCues?: LyricCue[];
  tracks?: MusicTrack[];
  seed?: string;
  reference?: GenerationReferenceSettings;
  parentVersionId?: string;
  mastering?: {
    profile: ToneProfile;
    sourceAssetId: string;
    status: "complete" | "failed";
    processedAt?: string;
  };
};

export type ProjectSummary = {
  id: string;
  title: string;
  genre: string;
  status: "draft" | "ready" | "rendering";
  updatedAt: string;
  bpm: number;
  musicKey: string;
  duration: string;
  accent: string;
};

export type MusicAsset = {
  id: string;
  name: string;
  type: "reference" | "vocal" | "loop" | "recording" | "generated";
  duration: string;
  durationSeconds: number;
  mimeType: string;
  size: number;
  waveform: number[];
  localBlobKey: string;
  syncState: "local" | "queued" | "uploading" | "synced" | "failed";
  syncProgress?: number;
  bpm?: number;
  musicKey?: string;
  origin: string;
  projectId?: string;
  versionId?: string;
  visibility?: "visible" | "internal";
  audioRole?: "source" | "mastered";
  favorite: boolean;
  createdAt: string;
};

export type ModelConnection = {
  id: string;
  name: string;
  role: "agent" | "music" | "audio" | "input";
  status:
    | "connected"
    | "ready"
    | "preparing"
    | "offline"
    | "not-installed"
    | "unconfigured";
  runtime: string;
  note: string;
  capabilities: string[];
};

export type GenerationTask = {
  id: string;
  title: string;
  status: "complete" | "active" | "queued" | "failed";
  time: string;
  detail: string;
};

export type MusicBrief = {
  title: string;
  summary: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  language: string;
  vocalMode: string;
  instruments: string[];
  structure: string[];
  lyrics: string[];
  preserve: string[];
  change: string[];
  provider: string;
  costLabel: string;
};

export type AgentPlanResponse = {
  brief: MusicBrief;
  source: "codex" | "local";
  threadId?: string;
  warning?: string;
};

export type PlanMusicRequest = {
  projectId: string;
  prompt: string;
  vocalDelivery: VocalDelivery;
  selection: string[];
  currentProject: {
    bpm: number;
    key: string;
    selectedVersion: string;
  };
};

export type GeneratedAudio = {
  url: string;
  blob: Blob;
  duration: number;
  tracks: MusicTrack[];
  provider: string;
  costLabel: string;
  warning?: string;
  seed?: string;
};

export type MusicEngineStatus = "checking" | "preparing" | "ready" | "offline";

declare global {
  interface Window {
    musicAgent?: {
      planMusic: (request: PlanMusicRequest) => Promise<AgentPlanResponse>;
      platform: string;
    };
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

export {};
