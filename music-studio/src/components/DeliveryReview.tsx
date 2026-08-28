import type { CreationSession, ProjectVersion } from "../types";

type DeliveryReviewProps = {
  session: CreationSession;
  currentVersion?: ProjectVersion;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExport: () => void;
  onConfirm: () => void;
};

export function DeliveryReview({
  session,
  currentVersion,
  isPlaying,
  onTogglePlay,
  onExport,
  onConfirm,
}: DeliveryReviewProps) {
  const delivered = session.stages.delivered.status === "APPROVED";
  return (
    <section className="confirmation-stage delivery-review" aria-labelledby="delivery-title">
      <header className="confirmation-heading">
        <div>
          <span className="eyebrow">DELIVERY</span>
          <h3 id="delivery-title">
            {delivered ? "完整歌曲已交付" : "完整歌曲已生成"}
          </h3>
        </div>
        <span className={delivered ? "delivery-ready" : "confirmation-required"}>
          {delivered ? "已完成" : "等待终检"}
        </span>
      </header>
      <button type="button" className="sample-player" onClick={onTogglePlay}>
        <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
        <strong>{currentVersion?.label ?? "完整歌曲"}</strong>
        <small>
          {currentVersion?.duration
            ? `${Math.round(currentVersion.duration)} 秒 · 真实 WAV`
            : "真实 WAV 已保存"}
        </small>
      </button>
      <dl className="delivery-checks">
        <div>
          <dt>✓</dt>
          <dd>完整混音已保存到本机素材库</dd>
        </div>
        <div>
          <dt>✓</dt>
          <dd>方向、歌词、唱法和小样确认记录已锁定</dd>
        </div>
        <div>
          <dt>○</dt>
          <dd>真实人声与乐器分轨尚未生成，因此暂不显示假音轨</dd>
        </div>
      </dl>
      <div className="delivery-actions">
        <button type="button" className="quiet-button" onClick={onExport}>
          导出 WAV
        </button>
        {!delivered ? (
          <button type="button" className="stage-primary-action" onClick={onConfirm}>
            确认这版完成 <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
