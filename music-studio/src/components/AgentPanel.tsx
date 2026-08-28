import type { FormEvent, KeyboardEvent } from "react";

import type {
  AgentPlanResponse,
  AgentState,
  AudioVariant,
  CreationSession,
  DirectionCandidate,
  GenerationMode,
  GenerationPreferences,
  GenerationReferenceSettings,
  MusicAsset,
  MusicEngineStatus,
  MusicWorkflow,
  ProjectVersion,
  LyricVocalDraft,
  VocalTechnique,
} from "../types";
import { AgentWorkflow } from "./AgentWorkflow";
import { DirectionConfirmation } from "./DirectionConfirmation";
import { DeliveryReview } from "./DeliveryReview";
import { GenerationResultActions } from "./GenerationResultActions";
import { GenerationSettings } from "./GenerationSettings";
import { LyricsVocalConfirmation } from "./LyricsVocalConfirmation";
import { ProductionHistory } from "./ProductionHistory";
import { ReferenceAudioControls } from "./ReferenceAudioControls";
import { SampleReview } from "./SampleReview";

type AgentPanelProps = {
  state: AgentState;
  progress: number;
  progressLabel: string;
  workflow: MusicWorkflow;
  plan: AgentPlanResponse | null;
  prompt: string;
  lyricsCharacterCount: number;
  selectedNames: string[];
  isListening: boolean;
  voiceAvailable: boolean;
  generationMode: GenerationMode;
  musicEngineStatus: MusicEngineStatus;
  preferences: GenerationPreferences;
  assets: MusicAsset[];
  referenceSettings: GenerationReferenceSettings;
  hasAudio: boolean;
  resultVersions: ProjectVersion[];
  currentVersion?: ProjectVersion;
  selectedVersion: string;
  audioVariant: AudioVariant;
  remasteringVersionId: string | null;
  creationSession: CreationSession | null;
  directions: DirectionCandidate[];
  selectedDirectionId: string;
  lyricDraft: LyricVocalDraft | null;
  isPlaying: boolean;
  onPromptChange: (value: string) => void;
  onPreferencesChange: (preferences: GenerationPreferences) => void;
  onReferenceSettingsChange: (settings: GenerationReferenceSettings) => void;
  onOpenLibrary: () => void;
  onSubmit: () => void;
  onToggleListening: () => void;
  onRefineChorus: () => void;
  onNewProject: () => void;
  onExport: () => void;
  onSelectVersion: (versionId: string) => void;
  onSelectAudioVariant: (variant: AudioVariant) => void;
  onRemasterVersion: (versionId: string) => void;
  onCompare: () => void;
  onSelectDirection: (id: string) => void;
  onChangeDirection: (direction: DirectionCandidate) => void;
  onApproveDirection: () => void;
  onRefreshDirections: () => void;
  onReturnToIdea: () => void;
  onChangeLyricLine: (lineId: string, text: string) => void;
  onToggleTechnique: (lineId: string, technique: VocalTechnique) => void;
  onApproveLyrics: () => void;
  onReturnToDirection: () => void;
  onTogglePlay: () => void;
  onStartSample: () => void;
  onApproveSample: () => void;
  onStartFullSong: () => void;
  onReviseSample: (message: string) => void;
  onBackToLyrics: () => void;
  onConfirmDelivery: () => void;
};

const suggestions = [
  "写一首雨夜氛围的中文 R&B",
  "写一首温暖治愈的民谣",
  "写一首适合开车听的流行歌",
];

export function AgentPanel({
  state,
  progress,
  progressLabel,
  workflow,
  plan,
  prompt,
  lyricsCharacterCount,
  selectedNames,
  isListening,
  voiceAvailable,
  generationMode,
  musicEngineStatus,
  preferences,
  assets,
  referenceSettings,
  hasAudio,
  resultVersions,
  currentVersion,
  selectedVersion,
  audioVariant,
  remasteringVersionId,
  creationSession,
  directions,
  selectedDirectionId,
  lyricDraft,
  isPlaying,
  onPromptChange,
  onPreferencesChange,
  onReferenceSettingsChange,
  onOpenLibrary,
  onSubmit,
  onToggleListening,
  onRefineChorus,
  onNewProject,
  onExport,
  onSelectVersion,
  onSelectAudioVariant,
  onRemasterVersion,
  onCompare,
  onSelectDirection,
  onChangeDirection,
  onApproveDirection,
  onRefreshDirections,
  onReturnToIdea,
  onChangeLyricLine,
  onToggleTechnique,
  onApproveLyrics,
  onReturnToDirection,
  onTogglePlay,
  onStartSample,
  onApproveSample,
  onStartFullSong,
  onReviseSample,
  onBackToLyrics,
  onConfirmDelivery,
}: AgentPanelProps) {
  const isBusy = state === "thinking" || state === "rendering";
  const isModelPreparing =
    musicEngineStatus === "checking" || musicEngineStatus === "preparing";
  const isModelOffline = musicEngineStatus === "offline";
  const hasValidReference =
    referenceSettings.mode === "none" ||
    assets.some((asset) => asset.id === referenceSettings.assetId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <aside className="agent-panel" aria-labelledby="agent-heading">
      <div className="agent-heading-row">
        <div>
          <span className="eyebrow">AI PRODUCER</span>
          <h2 id="agent-heading">制作人 Agent</h2>
          <span className={`engine-readiness is-${musicEngineStatus}`}>
            <i /> {engineStatusLabel(musicEngineStatus)}
          </span>
        </div>
        <span className={`agent-status status-${state}`}>
          <i /> {stateLabel(state)}
        </span>
      </div>

      <div
        className={`agent-lens ${selectedNames.length ? "has-selection" : ""}`}
      >
        <span className="lens-line" aria-hidden="true" />
        <span className="lens-target" aria-hidden="true">
          ⌖
        </span>
        <div>
          <small>本次操作范围</small>
          <strong>
            {selectedNames.length ? selectedNames.join("、") : "整首作品"}
          </strong>
        </div>
        <span className="agent-mode">{modeLabel(generationMode)}</span>
      </div>

      <div className="agent-scroll">
        {creationSession?.currentStage === "direction" &&
        creationSession.stages.direction.status ===
          "AWAITING_CONFIRMATION" ? (
          <DirectionConfirmation
            directions={directions}
            selectedId={selectedDirectionId}
            onSelect={onSelectDirection}
            onChange={onChangeDirection}
            onApprove={onApproveDirection}
            onRefresh={onRefreshDirections}
            onBack={onReturnToIdea}
          />
        ) : creationSession?.currentStage === "lyrics-vocal" &&
          creationSession.stages["lyrics-vocal"].status ===
            "AWAITING_CONFIRMATION" &&
          lyricDraft ? (
          <LyricsVocalConfirmation
            draft={lyricDraft}
            targetSeconds={preferences.duration}
            onChangeLine={onChangeLyricLine}
            onToggleTechnique={onToggleTechnique}
            onApprove={onApproveLyrics}
            onBack={onReturnToDirection}
          />
        ) : creationSession &&
          (creationSession.currentStage === "sample" ||
            creationSession.currentStage === "full-song") ? (
          <SampleReview
            session={creationSession}
            isBusy={isBusy}
            currentVersion={currentVersion}
            fullDuration={preferences.duration === 30 ? 60 : preferences.duration}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onStartSample={onStartSample}
            onApproveSample={onApproveSample}
            onStartFullSong={onStartFullSong}
            onReviseSample={onReviseSample}
            onBackToLyrics={onBackToLyrics}
          />
        ) : creationSession &&
          (creationSession.currentStage === "editing" ||
            creationSession.currentStage === "delivered") ? (
          <DeliveryReview
            session={creationSession}
            currentVersion={currentVersion}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onExport={onExport}
            onConfirm={onConfirmDelivery}
          />
        ) : (
          <AgentWorkflow workflow={workflow} />
        )}
        {creationSession ? <ProductionHistory session={creationSession} /> : null}
        {isBusy ? (
          <div className="workflow-live-status" aria-live="polite">
            <strong>{progressLabel}</strong>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="模型任务进度"
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <output>{progress}%</output>
          </div>
        ) : null}
        {!isBusy && !creationSession ? (
          <>
            {plan ? <PlanSummary plan={plan} /> : null}
            <GenerationResultActions
              hasAudio={hasAudio && state === "complete"}
              hasError={state === "error"}
              versions={resultVersions}
              currentVersion={currentVersion}
              selectedVersion={selectedVersion}
              audioVariant={audioVariant}
              remasteringVersionId={remasteringVersionId}
              onRegenerate={onSubmit}
              onRefineChorus={onRefineChorus}
              onNewProject={onNewProject}
              onExport={onExport}
              onRetry={onSubmit}
              onSelectVersion={onSelectVersion}
              onSelectAudioVariant={onSelectAudioVariant}
              onRemasterVersion={onRemasterVersion}
              onCompare={onCompare}
            />
          </>
        ) : null}
      </div>

      {!creationSession || creationSession.currentStage === "idea" ? (
      <form className="agent-composer" onSubmit={submit}>
        <label htmlFor="music-prompt">你想做一首什么歌？</label>
        <textarea
          id="music-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：写一首凌晨雨夜的中文歌，女声，主歌安静，副歌慢慢打开……"
          rows={4}
          disabled={isBusy}
        />
        <div className="prompt-suggestions" aria-label="创作建议">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPromptChange(suggestion)}
              disabled={isBusy}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <GenerationSettings
          preferences={preferences}
          disabled={isBusy}
          promptCharacters={prompt.replace(/\s/g, "").length}
          currentLyricsCharacters={lyricsCharacterCount}
          onChange={onPreferencesChange}
        />
        <ReferenceAudioControls
          assets={assets}
          settings={referenceSettings}
          disabled={isBusy}
          onChange={onReferenceSettingsChange}
          onOpenLibrary={onOpenLibrary}
        />
        <div className="composer-actions">
          <button
            className={`voice-button ${isListening ? "is-listening" : ""}`}
            type="button"
            onClick={onToggleListening}
            aria-label={
              voiceAvailable
                ? isListening
                  ? "停止语音输入"
                  : "开始语音输入"
                : "当前环境不支持语音输入"
            }
            aria-pressed={isListening}
          >
            <span aria-hidden="true">◉</span>
            {isListening ? "正在听" : "语音"}
          </button>
          <span className="shortcut">⌘↵</span>
          <button
            className="generate-button"
            type="submit"
            disabled={
              isBusy ||
              isModelPreparing ||
              isModelOffline ||
              !prompt.trim() ||
              !hasValidReference
            }
          >
            {isBusy
              ? "正在做歌"
              : isModelPreparing
                ? "模型准备中"
                : isModelOffline
                  ? "真实模型未启动"
                  : referenceSettings.mode === "style"
                    ? "参考这个风格生成"
                    : referenceSettings.mode === "cover"
                      ? "翻唱 / 重编这段音频"
                      : preferences.variantCount === 2
                        ? "生成 2 个版本"
                        : "生成一首歌"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
      ) : (
        <div className="agent-session-footer">
          <span>当前创意</span>
          <p>{creationSession.idea}</p>
          <small>每一步确认后才会进入下一步，音乐模型不会越级启动。</small>
        </div>
      )}
    </aside>
  );
}

function PlanSummary({ plan }: { plan: AgentPlanResponse }) {
  const { brief } = plan;
  return (
    <div className="plan-summary" aria-live="polite">
      <div className="plan-title">
        <span className="plan-source">
          {plan.source === "codex" ? "PRODUCER PLAN" : "LOCAL PLAN"}
        </span>
        <h3>{brief.title}</h3>
        <p>{brief.summary}</p>
      </div>

      <div className="brief-facts">
        <div>
          <span>曲风</span>
          <strong>{brief.genre}</strong>
        </div>
        <div>
          <span>情绪</span>
          <strong>{brief.mood}</strong>
        </div>
        <div>
          <span>速度</span>
          <strong>{brief.bpm} BPM</strong>
        </div>
        <div>
          <span>调性</span>
          <strong>{brief.key}</strong>
        </div>
      </div>

      <section className="operation-block keep">
        <h4>
          <span aria-hidden="true">◇</span> 保留
        </h4>
        <ul>
          {brief.preserve.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="operation-block change">
        <h4>
          <span aria-hidden="true">↗</span> 本次修改
        </h4>
        <ul>
          {brief.change.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="provider-note">
        <span>{brief.provider}</span>
        <strong>{brief.costLabel}</strong>
      </div>
      {plan.warning ? <p className="agent-warning">{plan.warning}</p> : null}
    </div>
  );
}

function stateLabel(state: AgentState) {
  switch (state) {
    case "thinking":
      return "思考中";
    case "rendering":
      return "生成中";
    case "complete":
      return "已完成";
    case "error":
      return "需检查";
    default:
      return "就绪";
  }
}

function modeLabel(mode: GenerationMode) {
  return {
    full: "整首生成",
    region: "局部重绘",
    extend: "续写延展",
    rearrange: "重新编曲",
  }[mode];
}

function engineStatusLabel(status: MusicEngineStatus) {
  return {
    checking: "正在检查音乐模型",
    preparing: "真实模型首次准备中",
    ready: "ACE-Step 真实生成",
    offline: "当前为链路试听",
  }[status];
}
