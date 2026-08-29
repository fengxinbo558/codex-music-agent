import type {
  LyricAbstractionLevel,
  LyricWritingStyle,
  LyricVocalDraft,
  VocalTechnique,
} from "../types";
import { vocalTechniqueLabel } from "../services/lyricDraft";
import type { LyricWritingStyleGuide } from "../services/lyricWritingStyles";
import { LyricWritingStyleSelector } from "./LyricWritingStyleSelector";

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
  writingStyles: LyricWritingStyleGuide[];
  onChangeLine: (lineId: string, text: string) => void;
  onSelectWritingStyle: (style: LyricWritingStyle) => void;
  onChangeAbstraction: (level: LyricAbstractionLevel) => void;
  onRewriteLyrics: () => void;
  onUndoRewrite: () => void;
  isRewriting: boolean;
  canUndoRewrite: boolean;
  onToggleTechnique: (lineId: string, technique: VocalTechnique) => void;
  onApprove: () => void;
  onBack: () => void;
};

export function LyricsVocalConfirmation({
  draft,
  targetSeconds,
  writingStyles,
  onChangeLine,
  onSelectWritingStyle,
  onChangeAbstraction,
  onRewriteLyrics,
  onUndoRewrite,
  isRewriting,
  canUndoRewrite,
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
      <LyricWritingStyleSelector
        styles={writingStyles}
        selectedStyle={draft.writingStyle ?? "conversational"}
        onSelect={onSelectWritingStyle}
      />
      <section className="lyric-professional-review" aria-label="专业歌词检查">
        <header>
          <div>
            <span className="eyebrow">LYRIC LOGIC GATE</span>
            <h4>专业歌词检查</h4>
          </div>
          <strong className={draft.professionalReport.canApprove ? "is-ready" : "is-warning"}>
            {draft.professionalReport.score}/100
          </strong>
        </header>
        <div className="abstraction-choice" role="group" aria-label="歌词抽象程度">
          {([
            ["direct", "直接讲清楚"],
            ["balanced", "事实＋留白"],
            ["poetic", "更有诗意"],
          ] as Array<[LyricAbstractionLevel, string]>).map(([level, label]) => (
            <button
              key={level}
              type="button"
              className={draft.abstractionLevel === level ? "is-active" : ""}
              aria-pressed={draft.abstractionLevel === level}
              onClick={() => onChangeAbstraction(level)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="story-skeleton">
          <p><span>谁在说</span>{draft.skeleton.speaker}</p>
          <p><span>说给谁</span>{draft.skeleton.addressee}</p>
          <p><span>核心</span>{draft.skeleton.coreThesis}</p>
          <p><span>转折</span>{draft.skeleton.turn}</p>
          <p><span>落点</span>{draft.skeleton.conclusion}</p>
        </div>
        <div className="lyric-quality-grid">
          {draft.professionalReport.dimensions.map((dimension) => (
            <article key={dimension.id} className={dimension.pass ? "is-pass" : "is-fail"}>
              <span>{dimension.label}</span>
              <strong>{dimension.score}/{dimension.maxScore}</strong>
              <small>{dimension.explanation}</small>
            </article>
          ))}
        </div>
        {draft.professionalReport.factAnchors.length ? (
          <p className="fact-locks">
            <span>必须保留</span>
            {draft.professionalReport.factAnchors.map((fact) => (
              <em
                key={fact}
                className={draft.professionalReport.coveredFactAnchors.includes(fact) ? "is-covered" : "is-missing"}
              >
                {fact}
              </em>
            ))}
          </p>
        ) : null}
        {draft.professionalReport.warnings.length ? (
          <ul className="professional-warnings">
            {draft.professionalReport.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        ) : null}
      </section>
      <div className="lyric-rewrite-actions">
        <button type="button" disabled={isRewriting} onClick={onRewriteLyrics}>
          {isRewriting ? "正在重新起草…" : "按所选写法重新起草歌词"}
        </button>
        {canUndoRewrite ? (
          <button type="button" disabled={isRewriting} onClick={onUndoRewrite}>
            撤回上次重写
          </button>
        ) : null}
        <small>每次重写都会保留上一稿，仍需你逐句确认。</small>
      </div>
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
        <button
          type="button"
          className="stage-primary-action"
          disabled={!draft.professionalReport.canApprove}
          title={draft.professionalReport.canApprove ? undefined : "先修复歌词逻辑、事实或可唱性问题"}
          onClick={onApprove}
        >
          {draft.professionalReport.canApprove ? "确认，制作核心小样" : "歌词检查未通过"} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
