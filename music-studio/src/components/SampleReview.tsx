import type { CreationSession, ProjectVersion } from "../types";

type SampleReviewProps = {
  session: CreationSession;
  isBusy: boolean;
  currentVersion?: ProjectVersion;
  fullDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStartSample: () => void;
  onApproveSample: () => void;
  onStartFullSong: () => void;
  onReviseSample: (message: string) => void;
  onBackToLyrics: () => void;
};

export function SampleReview({
  session,
  isBusy,
  currentVersion,
  fullDuration,
  isPlaying,
  onTogglePlay,
  onStartSample,
  onApproveSample,
  onStartFullSong,
  onReviseSample,
  onBackToLyrics,
}: SampleReviewProps) {
  const sampleStatus = session.stages.sample.status;
  const isFullSong = session.currentStage === "full-song";
  if (isFullSong) {
    return (
      <section className="confirmation-stage sample-review" aria-labelledby="full-song-title">
        <header className="confirmation-heading">
          <div>
            <span className="eyebrow">FULL SONG</span>
            <h3 id="full-song-title">小样已通过，生成整首</h3>
          </div>
          <span className="confirmation-required">方向已锁定</span>
        </header>
        <p className="confirmation-intro">
          整首会沿用你刚才确认的方向、歌词和逐句唱法，不重新猜一遍。
        </p>
        <button
          type="button"
          className="sample-main-action"
          disabled={isBusy}
          onClick={onStartFullSong}
        >
          <span aria-hidden="true">▶</span>
          <strong>{isBusy ? "正在生成整首" : "开始生成完整歌曲"}</strong>
          <small>预计生成 {fullDuration} 秒，完成后保存为新的完整版本</small>
        </button>
      </section>
    );
  }

  if (sampleStatus !== "AWAITING_CONFIRMATION") {
    return (
      <section className="confirmation-stage sample-review" aria-labelledby="sample-title">
        <header className="confirmation-heading">
          <div>
            <span className="eyebrow">CORE SAMPLE</span>
            <h3 id="sample-title">先做 20–30 秒核心小样</h3>
          </div>
          <span className="confirmation-required">推荐路线</span>
        </header>
        <p className="confirmation-intro">
          先听副歌和情绪最强的位置，确认人声、咬字和气质，再花时间生成整首。
        </p>
        <button
          type="button"
          className="sample-main-action"
          disabled={isBusy}
          onClick={onStartSample}
        >
          <span aria-hidden="true">◇</span>
          <strong>{isBusy ? "正在制作核心小样" : "生成 30 秒核心小样"}</strong>
          <small>真实调用 ACE-Step · 完成后先试听确认</small>
        </button>
        <button type="button" className="quiet-button" onClick={onBackToLyrics}>
          返回修改歌词与唱法
        </button>
      </section>
    );
  }

  return (
    <section className="confirmation-stage sample-review" aria-labelledby="sample-review-title">
      <header className="confirmation-heading">
        <div>
          <span className="eyebrow">CONFIRM 03</span>
          <h3 id="sample-review-title">试听核心小样</h3>
        </div>
        <span className="confirmation-required">需要你确认</span>
      </header>
      <button type="button" className="sample-player" onClick={onTogglePlay}>
        <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
        <strong>{currentVersion?.label ?? "核心小样"}</strong>
        <small>{currentVersion?.duration ? `${Math.round(currentVersion.duration)} 秒` : "真实 WAV"}</small>
      </button>
      <div className="sample-feedback-grid">
        <button type="button" onClick={() => onReviseSample("人声更清楚，减少拖音和混响")}>人声更清楚</button>
        <button type="button" onClick={() => onReviseSample("情绪更强，副歌增加爆发")}>情绪更强</button>
        <button type="button" onClick={() => onReviseSample("情绪更克制，减少嘶吼")}>更克制</button>
        <button type="button" onClick={onBackToLyrics}>修改歌词 / 唱法</button>
      </div>
      <button type="button" className="stage-primary-action" onClick={onApproveSample}>
        满意，继续生成整首 <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
