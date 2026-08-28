import type {
  LyricVocalDraft,
  VocalTechnique,
} from "../types";
import { vocalTechniqueLabel } from "../services/lyricDraft";

const EXTRA_TECHNIQUES: VocalTechnique[] = [
  "angry",
  "cry",
  "shout",
  "restrained",
  "gentle",
  "breathy",
  "raspy",
  "gritty",
  "vibrato",
  "run",
  "slide",
  "sustain",
  "pause",
  "spoken",
  "diction",
];

type LyricsVocalConfirmationProps = {
  draft: LyricVocalDraft;
  targetSeconds: number;
  onChangeLine: (lineId: string, text: string) => void;
  onToggleTechnique: (lineId: string, technique: VocalTechnique) => void;
  onApprove: () => void;
  onBack: () => void;
};

export function LyricsVocalConfirmation({
  draft,
  targetSeconds,
  onChangeLine,
  onToggleTechnique,
  onApprove,
  onBack,
}: LyricsVocalConfirmationProps) {
  const tooLong = draft.estimatedSeconds > targetSeconds;
  return (
    <section className="confirmation-stage lyrics-confirmation" aria-labelledby="lyrics-confirmation-title">
      <header className="confirmation-heading">
        <div>
          <span className="eyebrow">CONFIRM 02</span>
          <h3 id="lyrics-confirmation-title">确认歌词与唱法</h3>
        </div>
        <span className="confirmation-required">需要你确认</span>
      </header>
      <div className={`duration-fit ${tooLong ? "is-warning" : "is-ready"}`}>
        <strong>{draft.lines.length} 句 · 预计 {draft.estimatedSeconds} 秒</strong>
        <span>
          {tooLong
            ? `超过 ${targetSeconds} 秒目标，建议缩短警告句或增加歌曲时长。`
            : `可以放进 ${targetSeconds} 秒目标时长。`}
        </span>
      </div>

      <div className="lyric-draft-list">
        {draft.lines.map((line, index) => {
          const cues = draft.vocalCues.filter(
            (cue) => cue.lyricLineId === line.id,
          );
          return (
            <article key={line.id} className="lyric-draft-line">
              <div className="lyric-line-meta">
                <span>{line.section}</span>
                <small>{line.source === "user" ? "你的原文" : "AI 补写"}</small>
                <em>{String(index + 1).padStart(2, "0")}</em>
              </div>
              <input
                aria-label={`${line.section}第 ${index + 1} 句歌词`}
                value={line.text}
                onChange={(event) =>
                  onChangeLine(line.id, event.currentTarget.value)
                }
              />
              {line.warnings.length ? (
                <ul className="lyric-risk-list">
                  {line.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div className="vocal-cue-row" aria-label={`${line.text}的唱法`}>
                {EXTRA_TECHNIQUES.map((technique) => {
                  const cue = cues.find((item) => item.technique === technique);
                  const recommended = cue?.source === "recommended";
                  const show = Boolean(cue) || ["angry", "cry", "breathy", "vibrato", "diction"].includes(technique);
                  if (!show) return null;
                  return (
                    <button
                      key={technique}
                      type="button"
                      className={cue ? "is-active" : ""}
                      aria-pressed={Boolean(cue)}
                      title={cue?.reason}
                      onClick={() => onToggleTechnique(line.id, technique)}
                    >
                      {vocalTechniqueLabel(technique)}
                      {recommended ? <sup>荐</sup> : null}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="confirmation-actions">
        <button type="button" className="quiet-button" onClick={onBack}>
          返回创作方向
        </button>
        <button type="button" className="stage-primary-action" onClick={onApprove}>
          确认，制作核心小样 <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
