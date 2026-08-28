import { PROJECT_DURATION, sections } from "../data/demoProject";

type TimelineProps = {
  waveform: number[];
  duration: number;
  currentTime: number;
  hasAudio: boolean;
  onSeek: (seconds: number) => void;
  zoom?: number;
};

export function Timeline({
  waveform,
  duration,
  currentTime,
  hasAudio,
  onSeek,
  zoom = 100,
}: TimelineProps) {
  const safeDuration = Math.max(0, duration);
  const progress = safeDuration
    ? Math.min(100, (currentTime / safeDuration) * 100)
    : 0;

  return (
    <section
      className="timeline-panel master-timeline"
      aria-labelledby="timeline-heading"
    >
      <div className="timeline-title-row">
        <div>
          <span className="eyebrow">MASTER RECORDING</span>
          <h1 id="timeline-heading">完整歌曲波形</h1>
        </div>
        <div className="selection-summary" aria-live="polite">
          <span
            className={`selection-beacon ${hasAudio ? "is-active" : ""}`}
          />
          {hasAudio
            ? "当前是一份真实混合音频；分轨完成后才显示独立音轨"
            : "生成歌曲后，这里会显示它的真实波形"}
        </div>
      </div>

      {hasAudio && waveform.length ? (
        <div className="master-timeline-scroll" style={{ width: `${zoom}%` }}>
          <div className="master-ruler" aria-hidden="true">
            {sections.map((section) => (
              <span
                key={section.id}
                style={{
                  left: `${(section.start / PROJECT_DURATION) * 100}%`,
                  width: `${(section.duration / PROJECT_DURATION) * 100}%`,
                }}
              >
                {section.name}
              </span>
            ))}
          </div>
          <div className="master-track">
            <div className="master-track-label">
              <i aria-hidden="true" />
              <span>
                <strong>完整混音</strong>
                <small>真实 WAV</small>
              </span>
            </div>
            <div className="master-wave-lane">
              <div className="master-waveform" aria-hidden="true">
                {waveform.map((height, index) => (
                  <i
                    key={index}
                    style={{ height: `${Math.max(5, height * 100)}%` }}
                  />
                ))}
              </div>
              <span
                className="playhead"
                aria-hidden="true"
                style={{ left: `${progress}%` }}
              />
              <input
                type="range"
                min="0"
                max={safeDuration || 1}
                step="0.01"
                value={Math.min(currentTime, safeDuration || 0)}
                aria-label="在完整歌曲中定位"
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
              />
            </div>
          </div>
          <div className="master-time-axis" aria-hidden="true">
            <span>00:00</span>
            <span>{formatTime(safeDuration / 2)}</span>
            <span>{formatTime(safeDuration)}</span>
          </div>
        </div>
      ) : (
        <div className="master-wave-empty">
          <span aria-hidden="true">♪</span>
          <div>
            <strong>还没有真实歌曲</strong>
            <p>先在右侧填写创意。生成并保存成功后，真实波形会出现在这里。</p>
          </div>
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60,
  ).padStart(2, "0")}`;
}
