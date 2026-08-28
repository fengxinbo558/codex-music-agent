import { useEffect, useMemo, useRef } from "react";

import { activeLyricCueIndex } from "../services/lyricTiming";
import type { LyricCue } from "../types";
import { VocalPitchEditor } from "./VocalPitchEditor";

type KaraokeLyricsProps = {
  cues: LyricCue[];
  currentTime: number;
  hasAudio: boolean;
  isInstrumental: boolean;
  onSeek: (seconds: number) => void;
  canEditPitch?: boolean;
  pitchEditing?: boolean;
  onApplyPitch?: (cue: LyricCue, semitones: number) => void;
};

export function KaraokeLyrics({
  cues,
  currentTime,
  hasAudio,
  isInstrumental,
  onSeek,
  canEditPitch = false,
  pitchEditing = false,
  onApplyPitch,
}: KaraokeLyricsProps) {
  const activeIndex = useMemo(
    () => activeLyricCueIndex(cues, currentTime),
    [cues, currentTime],
  );
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  if (!hasAudio) return null;

  return (
    <section className="karaoke-panel" aria-labelledby="karaoke-heading">
      <div className="karaoke-heading">
        <div>
          <span className="eyebrow">SING ALONG</span>
          <h2 id="karaoke-heading">跟唱歌词</h2>
        </div>
        {!isInstrumental && cues.length ? (
          <span className="timing-source">
            {cues.every((cue) => cue.source === "aligned")
              ? "模型时间轴"
              : "智能估时"}
          </span>
        ) : null}
      </div>
      {isInstrumental ? (
        <div className="karaoke-empty">当前版本是纯音乐，没有演唱歌词。</div>
      ) : cues.length ? (
        <div className="karaoke-lines" aria-live="polite">
          {cues.map((cue, index) => (
            <button
              ref={index === activeIndex ? activeRef : undefined}
              key={cue.id}
              className={index === activeIndex ? "is-active" : ""}
              type="button"
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => onSeek(cue.start)}
            >
              <time>{formatCueTime(cue.start)}</time>
              <span>{cue.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="karaoke-empty">这个版本没有可显示的歌词。</div>
      )}
      {cues.some((cue) => cue.source === "estimated") ? (
        <p className="karaoke-note">
          当前按句长和歌曲时长智能估时；点击任意一句可以跳到对应位置。
        </p>
      ) : null}
      {!isInstrumental && onApplyPitch ? (
        <VocalPitchEditor
          cues={cues}
          activeCueId={cues[activeIndex]?.id}
          canEdit={canEditPitch}
          isProcessing={pitchEditing}
          onApply={onApplyPitch}
        />
      ) : null}
    </section>
  );
}

function formatCueTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
