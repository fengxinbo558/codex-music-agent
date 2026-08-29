export type AgentState =
  | "idle"
  | "thinking"
  | "rendering"
  | "complete"
  | "error";

export type TrackKind = "vocal" | "instrument" | "drums" | "texture";

export type StemRole = "vocals" | "drums" | "bass" | "other";

export type AppView = "projects" | "studio" | "library" | "models";

export type AudioVariant = "source" | "optimized";

export type StudioBottomTab = "lyrics" | "mixer" | "versions" | "tasks";

export type GenerationMode = "full" | "region" | "extend" | "rearrange";

export type GenerationDuration = 30 | 60 | 90 | 120 | 180 | 240;

export type VocalStyle = "female" | "male" | "instrumental";

export type VocalDelivery = "natural" | "angryRock" | "extremeScream";

export type LyricClarity = "natural" | "clear";

export type LyricsMode = "auto" | "current";

export type LyricWritingStyle =
  | "conversational"
  | "poetic"
  | "dialogue"
  | "prose"
  | "hook";

export type LyricAbstractionLevel = "direct" | "balanced" | "poetic";

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
  variantCount: 1 | 2 | 4;
  toneProfile: ToneProfile;
};

export type LyricCue = {
  id: string;
  text: string;
  start: number;
  end: number;
  source: "estimated" | "aligned";
  observedText?: string;
  matchRatio?: number;
  confidence?: number;
};

export type LyricAlignmentQuality = {
  status: "processing" | "passed" | "warning" | "failed";
  overallMatch: number;
  textPrecision?: number;
  lineCoverage: number;
  keyTermMatch: number;
  averageConfidence: number;
  vocalCoverage: number;
  unbiasedMatch?: number;
  matchedKeyTerms: string[];
  warnings: string[];
};

export type LyricAlignmentAudit = {
  status: "processing" | "passed" | "warning" | "failed";
  transcription: string;
  jobId?: string;
  quality?: LyricAlignmentQuality;
  error?: string;
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

export type CreationStage =
  | "idea"
  | "direction"
  | "lyrics-vocal"
  | "sample"
  | "full-song"
  | "editing"
  | "delivered";

export type StageStatus =
  | "DRAFT"
  | "AWAITING_CONFIRMATION"
  | "APPROVED"
  | "REVISING"
  | "FAILED";

export type CreationStageState = {
  stage: CreationStage;
  status: StageStatus;
  revision: number;
  summary?: string;
  error?: string;
};

export type ApprovedAssetSnapshot = {
  id: string;
  stage: CreationStage;
  revision: number;
  approvedAt: string;
  summary: string;
  payload: Record<string, unknown>;
};

export type RevisionFeedback = {
  id: string;
  stage: CreationStage;
  createdAt: string;
  message: string;
};

export type CreationSession = {
  id: string;
  projectId: string;
  currentStage: CreationStage;
  idea: string;
  createdAt: string;
  updatedAt: string;
  stages: Record<CreationStage, CreationStageState>;
  stageDrafts: Partial<Record<CreationStage, Record<string, unknown>>>;
  approvedSnapshots: ApprovedAssetSnapshot[];
  revisionFeedback: RevisionFeedback[];
};

export type CreationSessionEvent =
  | { type: "SUBMIT_IDEA"; idea: string; at?: string }
  | {
      type: "TASK_SUCCEEDED";
      stage: CreationStage;
      summary: string;
      payload?: Record<string, unknown>;
      at?: string;
    }
  | { type: "TASK_FAILED"; stage: CreationStage; error: string; at?: string }
  | {
      type: "APPROVE_DIRECTION";
      summary: string;
      payload: Record<string, unknown>;
      at?: string;
    }
  | {
      type: "APPROVE_LYRICS";
      summary: string;
      payload: Record<string, unknown>;
      at?: string;
    }
  | {
      type: "APPROVE_SAMPLE";
      summary: string;
      payload: Record<string, unknown>;
      at?: string;
    }
  | {
      type: "REQUEST_REVISION";
      stage: CreationStage;
      message: string;
      at?: string;
    }
  | {
      type: "APPROVE_DELIVERY";
      summary: string;
      payload: Record<string, unknown>;
      at?: string;
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
  generationKind?: "sample" | "full" | "edit";
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
  lyricLogicScore?: number;
  lyricFactAnchors?: string[];
  lyricAudit?: LyricAlignmentAudit;
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
  stems?: {
    status: "running" | "ready" | "failed";
    jobId?: string;
    assetIds?: Partial<Record<StemRole, string>>;
    error?: string;
    quality?: {
      passed: boolean;
      relativeReconstructionError: number;
    };
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
  audioRole?:
    | "source"
    | "mastered"
    | "stem-vocals"
    | "stem-drums"
    | "stem-bass"
    | "stem-other"
    | "vocal-edit";
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

export type DirectionCandidateKind = "recommended" | "safe" | "bold";

export type DirectionCandidate = {
  id: string;
  kind: DirectionCandidateKind;
  label: string;
  reason: string;
  durationSeconds: number;
  voiceTexture: string;
  brief: MusicBrief;
};

export type VocalTechnique =
  | "angry"
  | "cry"
  | "shout"
  | "restrained"
  | "gentle"
  | "cold"
  | "explosive"
  | "breathy"
  | "raspy"
  | "gritty"
  | "clear"
  | "thick"
  | "intimate"
  | "airy"
  | "vibrato"
  | "run"
  | "slide"
  | "sustain"
  | "pause"
  | "spoken"
  | "diction";

export type VocalPerformanceCue = {
  id: string;
  lyricLineId: string;
  characterStart: number;
  characterEnd: number;
  technique: VocalTechnique;
  intensity: 1 | 2 | 3;
  pitchSemitones?: number;
  timingOffsetMs?: number;
  durationDeltaMs?: number;
  clarity?: "natural" | "clear" | "emphasized";
  source: "recommended" | "user";
  reason?: string;
};

export type LyricDraftLine = {
  id: string;
  section: string;
  text: string;
  source: "user" | "ai";
  warnings: string[];
};

export type LyricStorySkeleton = {
  speaker: string;
  addressee: string;
  coreThesis: string;
  facts: string[];
  turn: string;
  conclusion: string;
};

export type LyricQualityDimensionId =
  | "thesis"
  | "relationship"
  | "facts"
  | "progression"
  | "motif"
  | "chorus"
  | "singability"
  | "cliche";

export type LyricQualityDimension = {
  id: LyricQualityDimensionId;
  label: string;
  score: number;
  maxScore: number;
  pass: boolean;
  explanation: string;
};

export type LyricProfessionalReport = {
  score: number;
  canApprove: boolean;
  dimensions: LyricQualityDimension[];
  factAnchors: string[];
  coveredFactAnchors: string[];
  missingFactAnchors: string[];
  warnings: string[];
};

export type LyricVocalDraft = {
  id: string;
  writingStyle: LyricWritingStyle;
  abstractionLevel: LyricAbstractionLevel;
  originalIdea: string;
  skeleton: LyricStorySkeleton;
  professionalReport: LyricProfessionalReport;
  lines: LyricDraftLine[];
  vocalCues: VocalPerformanceCue[];
  estimatedSeconds: number;
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

export type LocalAudioCapability =
  | "stems"
  | "pitch_analysis"
  | "pitch_shift"
  | "lyric_alignment";

export type LocalAudioJobStatus =
  | "queued"
  | "running"
  | "ready"
  | "failed"
  | "cancelled";

export type LocalAudioJob = {
  id: string;
  kind: string;
  status: LocalAudioJobStatus;
  progress: number;
  label: string;
  asset_ids: string[];
  result?: Record<string, unknown>;
  error: string | null;
};

export type LocalAudioHealth = {
  status: "ok";
  service: string;
  capabilities: Record<LocalAudioCapability, boolean>;
};

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
