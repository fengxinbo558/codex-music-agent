import { useEffect, useState } from "react";

import type { LyricCue } from "../types";

type VocalPitchEditorProps = {
  cues: LyricCue[];
  activeCueId?: string;
  canEdit: boolean;
  isProcessing: boolean;
  onApply: (cue: LyricCue, semitones: number) => void;
};

const SEMITONE_OPTIONS = [-3, -2, -1, 1, 2, 3];

export function VocalPitchEditor({
  cues,
  activeCueId,
  canEdit,
  isProcessing,
  onApply,
}: VocalPitchEditorProps) {
  const [selectedCueId, setSelectedCueId] = useState(activeCueId ?? cues[0]?.id ?? "");
  const [semitones, setSemitones] = useState(1);
  useEffect(() => {
    if (activeCueId) setSelectedCueId(activeCueId);
  }, [activeCueId]);
  const selectedCue = cues.find((cue) => cue.id === selectedCueId) ?? cues[0];
  if (!cues.length) return null;

  return (
    <section className={`vocal-pitch-editor ${canEdit ? "is-ready" : "is-locked"}`}>
      <header>
        <div>
          <span className="eyebrow">VOCAL DETAIL</span>
          <strong>逐句音高微调</strong>
        </div>
        <small>{canEdit ? "真实人声分轨" : "等待真实分轨"}</small>
      </header>
      <p>
        选一句，再升高或降低半音。系统会先检测真实基频，通过后才建立新版本，原版不会被覆盖。
      </p>
      <label>
        <span>要调整哪一句</span>
        <select
          value={selectedCue?.id ?? ""}
          disabled={!canEdit || isProcessing}
          onChange={(event) => setSelectedCueId(event.currentTarget.value)}
        >
          {cues.map((cue, index) => (
            <option key={cue.id} value={cue.id}>
              {String(index + 1).padStart(2, "0")} · {cue.text}
            </option>
          ))}
        </select>
      </label>
      <div className="pitch-step-options" aria-label="调整半音数">
        {SEMITONE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === semitones ? "is-selected" : ""}
            aria-pressed={value === semitones}
            disabled={!canEdit || isProcessing}
            onClick={() => setSemitones(value)}
          >
            {value > 0 ? `升 ${value}` : `降 ${Math.abs(value)}`}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="apply-pitch-edit"
        disabled={!canEdit || isProcessing || !selectedCue}
        onClick={() => selectedCue && onApply(selectedCue, semitones)}
      >
        {isProcessing
          ? "正在分析并建立新版本…"
          : canEdit
            ? `应用到这一句，建立新版本`
            : "先在上方生成真实分轨"}
      </button>
    </section>
  );
}
