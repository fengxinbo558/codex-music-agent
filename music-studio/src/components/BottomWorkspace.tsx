import { useState } from "react";

import { ToneVersionControls } from "./ToneVersionControls";

import type {
  AudioVariant,
  GenerationTask,
  MusicTrack,
  ProjectVersion,
  StudioBottomTab,
} from "../types";

type BottomWorkspaceProps = {
  lyrics: string[];
  bpm: number;
  musicKey: string;
  tracks: MusicTrack[];
  versions: ProjectVersion[];
  selectedVersion: string;
  tasks: GenerationTask[];
  onLyricsChange: (lyrics: string[]) => void;
  onTrackMixChange: (
    trackId: string,
    field: "volume" | "pan",
    value: number,
  ) => void;
  onSelectVersion: (versionId: string) => void;
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
  tracks,
  versions,
  selectedVersion,
  tasks,
  onLyricsChange,
  onTrackMixChange,
  onSelectVersion,
  audioVariant,
  remasteringVersionId,
  onSelectAudioVariant,
  onRemasterVersion,
  onCompare,
}: BottomWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<StudioBottomTab>("lyrics");
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
          className="mini-mixer"
        >
          {tracks.map((track) => (
            <div className="mixer-channel" key={track.id}>
              <span
                className="track-color"
                style={{ background: track.color }}
              />
              <strong>{track.name}</strong>
              <label>
                <span>音量</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={track.volume}
                  onChange={(event) =>
                    onTrackMixChange(
                      track.id,
                      "volume",
                      Number(event.currentTarget.value),
                    )
                  }
                />
                <output>{track.volume}</output>
              </label>
              <label>
                <span>声像</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={track.pan}
                  onChange={(event) =>
                    onTrackMixChange(
                      track.id,
                      "pan",
                      Number(event.currentTarget.value),
                    )
                  }
                />
                <output>
                  {track.pan === 0
                    ? "C"
                    : track.pan < 0
                      ? `L${Math.abs(track.pan)}`
                      : `R${track.pan}`}
                </output>
              </label>
            </div>
          ))}
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
