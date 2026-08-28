import { TONE_PROFILES } from "../data/toneProfiles";
import type { AudioVariant, ProjectVersion } from "../types";

type ToneVersionControlsProps = {
  version: ProjectVersion;
  audioVariant: AudioVariant;
  isRemastering: boolean;
  compact?: boolean;
  onSelectAudioVariant: (variant: AudioVariant) => void;
  onRemaster: () => void;
};

export function ToneVersionControls({
  version,
  audioVariant,
  isRemastering,
  compact = false,
  onSelectAudioVariant,
  onRemaster,
}: ToneVersionControlsProps) {
  if (!version.audioAssetId) return null;
  const mastering = version.mastering;
  const isOptimized = mastering?.status === "complete";
  const canCompare =
    isOptimized && mastering.sourceAssetId !== version.audioAssetId;
  const profile = mastering
    ? TONE_PROFILES[mastering.profile]
    : TONE_PROFILES.warm;
  const optimizedLabel = mastering?.profile === "bright" ? "优化" : "柔化";

  return (
    <div
      className={`tone-version-controls ${compact ? "is-compact" : ""}`}
      aria-label={`${version.label}声音质感`}
    >
      <div className="tone-version-status">
        <span aria-hidden="true">∿</span>
        <span>
          <small>声音质感</small>
          <strong>
            {isOptimized
              ? profile.label
              : mastering?.status === "failed"
                ? "模型原声 · 柔化未完成"
                : "模型原声"}
          </strong>
        </span>
      </div>
      {canCompare ? (
        <div
          className="audio-variant-switch"
          role="group"
          aria-label="原声与优化声音对比"
        >
          <button
            type="button"
            className={audioVariant === "source" ? "is-selected" : ""}
            aria-pressed={audioVariant === "source"}
            onClick={() => onSelectAudioVariant("source")}
          >
            原声
          </button>
          <button
            type="button"
            className={audioVariant === "optimized" ? "is-selected" : ""}
            aria-pressed={audioVariant === "optimized"}
            onClick={() => onSelectAudioVariant("optimized")}
          >
            {optimizedLabel}
          </button>
        </div>
      ) : (
        <button
          className="remaster-button"
          type="button"
          disabled={isRemastering}
          onClick={onRemaster}
        >
          {isRemastering
            ? "正在柔化…"
            : mastering?.status === "failed"
              ? "重试柔化"
              : "柔化重制"}
        </button>
      )}
      {isOptimized ? <small className="mastered-badge">已优化</small> : null}
    </div>
  );
}
