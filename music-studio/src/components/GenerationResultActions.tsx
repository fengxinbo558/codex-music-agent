import type { AudioVariant, ProjectVersion } from "../types";
import { ToneVersionControls } from "./ToneVersionControls";

type GenerationResultActionsProps = {
  hasAudio: boolean;
  hasError: boolean;
  versions: ProjectVersion[];
  currentVersion?: ProjectVersion;
  selectedVersion: string;
  audioVariant: AudioVariant;
  remasteringVersionId: string | null;
  onRegenerate: () => void;
  onRefineChorus: () => void;
  onNewProject: () => void;
  onExport: () => void;
  onRetry: () => void;
  onSelectVersion: (versionId: string) => void;
  onSelectAudioVariant: (variant: AudioVariant) => void;
  onRemasterVersion: (versionId: string) => void;
  onCompare: () => void;
};

export function GenerationResultActions({
  hasAudio,
  hasError,
  versions,
  currentVersion,
  selectedVersion,
  audioVariant,
  remasteringVersionId,
  onRegenerate,
  onRefineChorus,
  onNewProject,
  onExport,
  onRetry,
  onSelectVersion,
  onSelectAudioVariant,
  onRemasterVersion,
  onCompare,
}: GenerationResultActionsProps) {
  const orderedVersions = currentVersion
    ? [
        currentVersion,
        ...versions.filter((version) => version.id !== currentVersion.id),
      ]
    : versions;
  if (hasError) {
    return (
      <section className="generation-failure" aria-labelledby="failure-title">
        <span aria-hidden="true">!</span>
        <div>
          <strong id="failure-title">这次没有生成完成</strong>
          <p>想法和设置都还在，可以直接重试，不用重新填写。</p>
        </div>
        <button type="button" onClick={onRetry}>
          重试这次生成
        </button>
      </section>
    );
  }

  if (!hasAudio) return null;
  return (
    <section className="result-actions" aria-labelledby="next-actions-title">
      {currentVersion ? (
        <>
          <ToneVersionControls
            version={currentVersion}
            audioVariant={audioVariant}
            isRemastering={remasteringVersionId === currentVersion.id}
            onSelectAudioVariant={onSelectAudioVariant}
            onRemaster={() => onRemasterVersion(currentVersion.id)}
          />
          {currentVersion.lyricAudit ? (
            <section className={`result-quality is-${currentVersion.lyricAudit.status}`}>
              <header>
                <span>真实歌词质检</span>
                <strong>{qualityStatusLabel(currentVersion.lyricAudit.status)}</strong>
              </header>
              {currentVersion.lyricAudit.quality ? (
                <dl>
                  <div><dt>唱词一致</dt><dd>{percent(currentVersion.lyricAudit.quality.overallMatch)}</dd></div>
                  <div><dt>无额外乱唱</dt><dd>{percent(currentVersion.lyricAudit.quality.textPrecision ?? 0)}</dd></div>
                  <div><dt>句子覆盖</dt><dd>{percent(currentVersion.lyricAudit.quality.lineCoverage)}</dd></div>
                  <div><dt>重点词</dt><dd>{percent(currentVersion.lyricAudit.quality.keyTermMatch)}</dd></div>
                  <div><dt>吐字置信</dt><dd>{percent(currentVersion.lyricAudit.quality.averageConfidence)}</dd></div>
                  <div><dt>自然识别支持</dt><dd>{percent(currentVersion.lyricAudit.quality.unbiasedMatch ?? 0)}</dd></div>
                  <div><dt>有效演唱覆盖</dt><dd>{percent(currentVersion.lyricAudit.quality.vocalCoverage)}</dd></div>
                </dl>
              ) : null}
              {currentVersion.lyricAudit.quality?.warnings.length ? (
                <p>{currentVersion.lyricAudit.quality.warnings.join("；")}</p>
              ) : currentVersion.lyricAudit.error ? <p>{currentVersion.lyricAudit.error}</p> : null}
            </section>
          ) : null}
        </>
      ) : null}
      {versions.length > 1 ? (
        <div className="quick-version-switch">
          <div>
            <span className="section-kicker">TWO VERSIONS</span>
            <strong>先听听哪一版更对</strong>
          </div>
          <div role="group" aria-label="本次生成的两个版本">
            {orderedVersions.slice(0, 2).map((version, index) => (
              <button
                key={version.id}
                className={selectedVersion === version.id ? "is-selected" : ""}
                type="button"
                aria-pressed={selectedVersion === version.id}
                onClick={() => onSelectVersion(version.id)}
              >
                <span>{index === 0 ? "A" : "B"}</span>
                <span>
                  <strong>{version.label}</strong>
                  <small>
                    {version.lyricAudit?.status === "passed"
                      ? selectedVersion === version.id
                        ? "已通过 · 正在试听"
                        : "已通过 · 切换试听"
                      : "未通过 · 仅供复听"}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <button className="quick-compare" type="button" onClick={onCompare}>
            打开详细 A / B 对比 →
          </button>
        </div>
      ) : null}
      <div className="result-actions-heading">
        <span className="section-kicker">NEXT STEP</span>
        <strong id="next-actions-title">接下来想怎么做？</strong>
      </div>
      <div className="result-action-grid">
        <button type="button" onClick={onRegenerate}>
          <span aria-hidden="true">↻</span>
          <strong>再生成一版</strong>
          <small>保留想法，做出不同结果</small>
        </button>
        <button
          type="button"
          disabled
          title="ACE-Step 的真实局部重绘任务尚未接通"
          onClick={onRefineChorus}
        >
          <span aria-hidden="true">⌁</span>
          <strong>只改副歌</strong>
          <small>待真实局部重绘接通后开放</small>
        </button>
        <button type="button" onClick={onNewProject}>
          <span aria-hidden="true">＋</span>
          <strong>做一首新歌</strong>
          <small>建立独立作品，不混入当前版本</small>
        </button>
        <button type="button" onClick={onExport}>
          <span aria-hidden="true">↓</span>
          <strong>导出作品</strong>
          <small>下载当前版本的 WAV</small>
        </button>
      </div>
    </section>
  );
}

function qualityStatusLabel(status: NonNullable<ProjectVersion["lyricAudit"]>["status"]) {
  return {
    processing: "正在听真实人声",
    passed: "全部质量门已通过",
    warning: "需要人工复听",
    failed: "未通过，不能交付",
  }[status];
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
