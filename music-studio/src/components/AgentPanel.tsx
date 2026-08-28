import type { FormEvent, KeyboardEvent } from "react";

import type {
  AgentPlanResponse,
  AgentState,
  AudioVariant,
  GenerationMode,
  GenerationPreferences,
  GenerationReferenceSettings,
  MusicAsset,
  MusicEngineStatus,
  ProjectVersion,
} from "../types";
import { GenerationResultActions } from "./GenerationResultActions";
import { GenerationSettings } from "./GenerationSettings";
import { ReferenceAudioControls } from "./ReferenceAudioControls";

type AgentPanelProps = {
  state: AgentState;
  progress: number;
  progressLabel: string;
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
}: AgentPanelProps) {
  const isBusy = state === "thinking" || state === "rendering";
  const isModelPreparing =
    musicEngineStatus === "checking" || musicEngineStatus === "preparing";
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
        {isBusy ? (
          <div className="agent-progress" aria-live="polite">
            <div className="thinking-orbit" aria-hidden="true">
              <span />
              <i />
            </div>
            <span>
              {state === "thinking"
                ? "Codex 正在理解你的想法"
                : "音乐引擎正在制作新版本"}
            </span>
            <strong>{progressLabel}</strong>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="生成进度"
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <output>{progress}%</output>
          </div>
        ) : (
          <>
            {plan ? (
              <PlanSummary plan={plan} />
            ) : (
              <div className="agent-intro">
                <span className="intro-glyph" aria-hidden="true">
                  ✦
                </span>
                <h3>一句话，做一首歌</h3>
                <p>
                  不用懂乐理。说清楚故事、情绪或想要的感觉，Agent
                  会替你整理曲风、速度、结构和歌词，再交给音乐模型生成。
                </p>
                <dl>
                  <div>
                    <dt>1</dt>
                    <dd>理解创作意图</dd>
                  </div>
                  <div>
                    <dt>2</dt>
                    <dd>规划曲风与结构</dd>
                  </div>
                  <div>
                    <dt>3</dt>
                    <dd>调用音乐模型</dd>
                  </div>
                  <div>
                    <dt>4</dt>
                    <dd>保存成新版本</dd>
                  </div>
                </dl>
              </div>
            )}
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
        )}
      </div>

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
              isBusy || isModelPreparing || !prompt.trim() || !hasValidReference
            }
          >
            {isBusy
              ? "正在做歌"
              : isModelPreparing
                ? "模型准备中"
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
    </aside>
  );
}

function PlanSummary({ plan }: { plan: AgentPlanResponse }) {
  const { brief } = plan;
  return (
    <div className="plan-summary" aria-live="polite">
      <div className="plan-title">
        <span className="plan-source">
          {plan.source === "codex" ? "CODEX PLAN" : "LOCAL PLAN"}
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
