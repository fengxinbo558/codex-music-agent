type TransportProps = {
  projectTitle: string;
  isPlaying: boolean;
  canPlay: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  musicKey: string;
  onBack: () => void;
  onExport: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
};

export function Transport({
  projectTitle,
  isPlaying,
  canPlay,
  currentTime,
  duration,
  bpm,
  musicKey,
  onBack,
  onExport,
  onTogglePlay,
  onSeek,
}: TransportProps) {
  return (
    <header className="transport">
      <div className="project-heading">
        <button
          className="back-button"
          type="button"
          onClick={onBack}
          aria-label="返回项目首页"
        >
          ←
        </button>
        <span className="project-kicker">当前工程</span>
        <strong>{projectTitle}</strong>
        <span className="save-state">已保存</span>
      </div>

      <div className="transport-controls" aria-label="播放控制">
        <button
          type="button"
          className="transport-icon"
          aria-label="返回开头"
          onClick={() => onSeek(0)}
        >
          <span aria-hidden="true">↤</span>
        </button>
        <button
          type="button"
          className="play-button"
          aria-label={isPlaying ? "暂停" : "播放"}
          onClick={onTogglePlay}
          disabled={!canPlay}
        >
          <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
        </button>
        <time className="timecode" dateTime={`PT${Math.round(currentTime)}S`}>
          {formatTime(currentTime)}
        </time>
      </div>

      <div className="transport-meta">
        <label>
          <span>BPM</span>
          <output>{bpm}</output>
        </label>
        <label>
          <span>调性</span>
          <output>{musicKey}</output>
        </label>
        <label>
          <span>拍号</span>
          <output>4 / 4</output>
        </label>
        <button className="export-button" type="button" onClick={onExport}>
          导出 <span aria-hidden="true">⇧</span>
        </button>
      </div>

      <input
        className="global-seek"
        type="range"
        min="0"
        max={Math.max(duration, 1)}
        step="0.01"
        value={currentTime}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        aria-label="播放位置"
        disabled={!canPlay}
      />
    </header>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}
