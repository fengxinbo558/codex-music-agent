import type { CreationSession, ProjectVersion } from "../types";

type DeliveryReviewProps = {
  session: CreationSession;
  currentVersion?: ProjectVersion;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExport: () => void;
  onStartStems: () => void;
  onConfirm: () => void;
};

export function DeliveryReview({
  session,
  currentVersion,
  isPlaying,
  onTogglePlay,
  onExport,
  onStartStems,
  onConfirm,
}: DeliveryReviewProps) {
  const delivered = session.stages.delivered.status === "APPROVED";
  const stemStatus = currentVersion?.stems?.status;
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
          <dt>{stemStatus === "ready" ? "✓" : stemStatus === "failed" ? "!" : "○"}</dt>
          <dd>
            {stemStatus === "ready"
              ? "人声、鼓、贝斯和其他乐器四条真实分轨已通过检查"
              : stemStatus === "running"
                ? "正在本机分离真实人声与乐器；完整混音可以先试听"
                : stemStatus === "failed"
                  ? `完整混音已保留；分轨未完成：${currentVersion?.stems?.error ?? "可以稍后重试"}`
                  : "真实人声与乐器分轨尚未生成，因此暂不显示假音轨"}
          </dd>
        </div>
      </dl>
      <div className="delivery-actions">
        <button type="button" className="quiet-button" onClick={onExport}>
          导出 WAV
        </button>
        {stemStatus !== "ready" && stemStatus !== "running" ? (
          <button type="button" className="quiet-button" onClick={onStartStems}>
            {stemStatus === "failed" ? "重试真实分轨" : "生成真实分轨"}
          </button>
        ) : null}
        {!delivered ? (
          <button type="button" className="stage-primary-action" onClick={onConfirm}>
            确认这版完成 <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
