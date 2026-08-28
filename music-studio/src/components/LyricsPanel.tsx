import { useState } from "react";

type LyricsPanelProps = {
  lyrics: string[];
  bpm: number;
  musicKey: string;
};

export function LyricsPanel({ lyrics, bpm, musicKey }: LyricsPanelProps) {
  const [activeTab, setActiveTab] = useState<"lyrics" | "details">("lyrics");

  return (
    <section className="lyrics-panel" aria-label="歌词与片段参数">
      <div className="editor-tabs" role="tablist" aria-label="底部编辑器">
        <button
          id="lyrics-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "lyrics"}
          aria-controls="lyrics-content"
          onClick={() => setActiveTab("lyrics")}
        >
          歌词
        </button>
        <button
          id="details-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          aria-controls="details-content"
          onClick={() => setActiveTab("details")}
        >
          制作参数
        </button>
      </div>

      {activeTab === "lyrics" ? (
        <div
          id="lyrics-content"
          role="tabpanel"
          aria-labelledby="lyrics-tab"
          className="lyrics-content"
        >
          <div className="lyric-lines">
            {lyrics.map((line, index) => (
              <p key={`${line}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {line}
              </p>
            ))}
          </div>
          <div className="lyric-note">
            <span>写作提示</span>
            <p>
              Agent 生成的歌词只是草稿。每次修改都会建立新版本，原稿不会被覆盖。
            </p>
          </div>
        </div>
      ) : (
        <div
          id="details-content"
          role="tabpanel"
          aria-labelledby="details-tab"
          className="details-grid"
        >
          <div>
            <span>速度</span>
            <strong>{bpm} BPM</strong>
          </div>
          <div>
            <span>调性</span>
            <strong>{musicKey}</strong>
          </div>
          <div>
            <span>采样</span>
            <strong>44.1 kHz</strong>
          </div>
          <div>
            <span>版本策略</span>
            <strong>非破坏式</strong>
          </div>
        </div>
      )}
    </section>
  );
}
