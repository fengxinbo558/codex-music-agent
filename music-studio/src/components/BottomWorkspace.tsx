import { useState } from "react";

import { ToneVersionControls } from "./ToneVersionControls";

import type {
  AudioVariant,
  GenerationTask,
  ProjectVersion,
  StudioBottomTab,
} from "../types";

type BottomWorkspaceProps = {
  lyrics: string[];
  bpm: number;
  musicKey: string;
  versions: ProjectVersion[];
  selectedVersion: string;
  tasks: GenerationTask[];
  onLyricsChange: (lyrics: string[]) => void;
  onSelectVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onClearGenerated: () => void;
  audioVariant: AudioVariant;
  remasteringVersionId: string | null;
  onSelectAudioVariant: (variant: AudioVariant) => void;
  onRemasterVersion: (versionId: string) => void;
  onCompare: () => void;
};

const tabs: Array<{ id: StudioBottomTab; label: string }> = [
  { id: "lyrics", label: "歌词" },
  { id: "mixer", label: "混音" },
  { id: "versions", label: "版本" },
  { id: "tasks", label: "任务" },
];

export function BottomWorkspace({
  lyrics,
  bpm,
  musicKey,
  versions,
  selectedVersion,
  tasks,
  onLyricsChange,
  onSelectVersion,
  onDeleteVersion,
  onClearGenerated,
  audioVariant,
  remasteringVersionId,
  onSelectAudioVariant,
  onRemasterVersion,
  onCompare,
}: BottomWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<StudioBottomTab>("lyrics");
  const currentVersion = versions.find((version) => version.id === selectedVersion);
  return (
    <section className="bottom-workspace" aria-label="作品编辑区">
      <div className="editor-tabs" role="tablist" aria-label="底部编辑器">
        {tabs.map((tab) => (
          <button
            id={`${tab.id}-tab`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-content`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === "versions" ? (
              <span>{versions.length}</span>
            ) : tab.id === "tasks" ? (
              <span>{tasks.length}</span>
            ) : null}
          </button>
        ))}
      </div>
      {activeTab === "lyrics" ? (
        <div
          id="lyrics-content"
          role="tabpanel"
          aria-labelledby="lyrics-tab"
          className="lyrics-editor-layout"
        >
          <label>
            <span className="sr-only">歌词，每行一句</span>
            <textarea
              value={lyrics.join("\n")}
              onChange={(event) =>
                onLyricsChange(event.currentTarget.value.split("\n"))
              }
              spellCheck={false}
            />
          </label>
          <div className="lyric-guide">
            <span className="section-kicker">LYRIC NOTES</span>
            <p>每行一句。Agent 生成时会读取这里的最新版，原版本仍会保留。</p>
            <dl>
              <div>
                <dt>行数</dt>
                <dd>{lyrics.filter(Boolean).length}</dd>
              </div>
              <div>
                <dt>语言</dt>
                <dd>中文</dd>
              </div>
              <div>
                <dt>速度</dt>
                <dd>{bpm} BPM</dd>
              </div>
              <div>
                <dt>调性</dt>
                <dd>{musicKey}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
      {activeTab === "mixer" ? (
        <div
          id="mixer-content"
          role="tabpanel"
          aria-labelledby="mixer-tab"
          className="capability-locked"
        >
          <span aria-hidden="true">{currentVersion?.stems?.status === "ready" ? "✓" : "◫"}</span>
          <div>
            <strong>
              {currentVersion?.stems?.status === "ready"
                ? "四条真实分轨已经接通"
                : currentVersion?.stems?.status === "running"
                  ? "正在分离真实音轨"
                  : "先生成完整歌曲，再建立真实分轨"}
            </strong>
            <p>
              {currentVersion?.stems?.status === "ready"
                ? "人声、鼓、贝斯和其他乐器都是真实 WAV；可在上方时间线逐轨试听，人声轨还用于歌词对齐与逐句音高编辑。"
                : "没有真实分轨时不会显示装饰性滑杆，也不会假装已经能混音。"}
            </p>
            <small>
              {currentVersion?.lyricAudit?.status === "passed"
                ? "实际唱词、吐字和逐句时间已经通过检查。"
                : currentVersion?.lyricAudit?.status === "failed"
                  ? "分轨可用，但唱词或吐字未通过；请看跟唱歌词中的差异。"
                  : "分轨完成后会自动进行真实歌词质检。"}
            </small>
          </div>
        </div>
      ) : null}
      {activeTab === "versions" ? (
        <div
          id="versions-content"
          role="tabpanel"
          aria-labelledby="versions-tab"
          className="version-workspace"
        >
          <div className="version-workspace-heading">
            <div>
              <strong>非破坏式版本</strong>
              <small>切换版本不会覆盖其他结果</small>
            </div>
            <button
              className="secondary-action"
              type="button"
              onClick={onCompare}
            >
              A / B 对比
            </button>
            <button
              className="danger-subtle-action"
              type="button"
              disabled={versions.length === 0}
              onClick={onClearGenerated}
            >
              清空生成结果
            </button>
          </div>
          <div className="version-cards">
            {versions.map((version) => {
              const isSelected = selectedVersion === version.id;
              return (
                <article
                  key={version.id}
                  className={isSelected ? "is-selected" : ""}
                >
                  <button
                    className="version-card-delete"
                    type="button"
                    aria-label={`删除${version.label}`}
                    onClick={() => onDeleteVersion(version.id)}
                  >
                    ⌫
                  </button>
                  <button
                    className="version-card-select"
                    type="button"
                    onClick={() => onSelectVersion(version.id)}
                  >
                    <span>{version.label}</span>
                    <strong>{version.note}</strong>
                    <small>
                      {version.createdAt} · {version.provider ?? "演示链路"}
                    </small>
                    {version.preferences ? (
                      <em>
                        {version.preferences.duration} 秒 ·{" "}
                        {version.preferences.variantCount === 2
                          ? "双版本同批生成"
                          : "单版本"}
                      </em>
                    ) : null}
                  </button>
                  {isSelected ? (
                    <ToneVersionControls
                      version={version}
                      audioVariant={audioVariant}
                      isRemastering={remasteringVersionId === version.id}
                      compact
                      onSelectAudioVariant={onSelectAudioVariant}
                      onRemaster={() => onRemasterVersion(version.id)}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
      {activeTab === "tasks" ? (
        <div
          id="tasks-content"
          role="tabpanel"
          aria-labelledby="tasks-tab"
          className="task-workspace"
        >
          <div className="task-column">
            <span className="section-kicker">QUEUE</span>
            <strong>当前队列为空</strong>
            <p>新的生成任务会在这里排队；可以离开创作台，不会丢失状态。</p>
          </div>
          <ol>
            {tasks.map((task) => (
              <li key={task.id}>
                <i className={`task-dot is-${task.status}`} />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.detail}</small>
                </span>
                <time>{task.time}</time>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
