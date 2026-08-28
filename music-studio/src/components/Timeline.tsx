import type { CSSProperties } from "react";

import { PROJECT_DURATION, sections } from "../data/demoProject";
import type { MusicClip, MusicTrack } from "../types";

type TimelineProps = {
  tracks: MusicTrack[];
  selectedClips: string[];
  playhead: number;
  onToggleClip: (clipId: string) => void;
  onToggleTrack: (trackId: string, field: "muted" | "solo") => void;
  onAuditionClip: (clip: MusicClip) => void | Promise<void>;
  auditioningClipId: string | null;
  canAudition: boolean;
  zoom?: number;
};

export function Timeline({
  tracks,
  selectedClips,
  playhead,
  onToggleClip,
  onToggleTrack,
  onAuditionClip,
  auditioningClipId,
  canAudition,
  zoom = 100,
}: TimelineProps) {
  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="timeline-title-row">
        <div>
          <span className="eyebrow">ARRANGEMENT</span>
          <h1 id="timeline-heading">编曲时间线</h1>
        </div>
        <div className="selection-summary" aria-live="polite">
          <span
            className={
              selectedClips.length
                ? "selection-beacon is-active"
                : "selection-beacon"
            }
          />
          {selectedClips.length
            ? `已选择 ${selectedClips.length} 个片段`
            : "点击片段，告诉 Agent 只改哪里"}
        </div>
      </div>

      <div className="timeline-scroll" style={{ width: `${zoom}%` }}>
        <div
          className="timeline-frame"
          style={{ gridTemplateRows: `30px repeat(${tracks.length}, 62px)` }}
        >
          <div className="timeline-corner" aria-hidden="true">
            音轨
          </div>
          <div className="section-ruler" aria-hidden="true">
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

          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              selectedClips={selectedClips}
              playhead={playhead}
              onToggleClip={onToggleClip}
              onToggleTrack={onToggleTrack}
              onAuditionClip={onAuditionClip}
              auditioningClipId={auditioningClipId}
              canAudition={canAudition}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type TrackRowProps = Omit<TimelineProps, "tracks"> & { track: MusicTrack };

function TrackRow({
  track,
  selectedClips,
  playhead,
  onToggleClip,
  onToggleTrack,
  onAuditionClip,
  auditioningClipId,
  canAudition,
}: TrackRowProps) {
  return (
    <>
      <div className="track-header">
        <span
          className="track-color"
          style={{ backgroundColor: track.color }}
        />
        <span className="track-name">{track.name}</span>
        <span className="track-actions">
          <button
            type="button"
            onClick={() => onToggleTrack(track.id, "muted")}
            aria-label={`${track.muted ? "取消静音" : "静音"}${track.name}`}
            aria-pressed={track.muted}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => onToggleTrack(track.id, "solo")}
            aria-label={`${track.solo ? "取消独奏" : "独奏"}${track.name}`}
            aria-pressed={track.solo}
          >
            S
          </button>
        </span>
      </div>
      <div className="track-lane" role="group" aria-label={`${track.name}音轨`}>
        <div
          className="playhead"
          aria-hidden="true"
          style={{ left: `${(playhead / PROJECT_DURATION) * 100}%` }}
        />
        {track.clips.map((clip) => {
          const isSelected = selectedClips.includes(clip.id);
          return (
            <div
              key={clip.id}
              className="audio-clip-shell"
              style={
                {
                  "left": `${(clip.start / PROJECT_DURATION) * 100}%`,
                  "width": `${(clip.duration / PROJECT_DURATION) * 100}%`,
                  "--track-color": track.color,
                } as CSSProperties
              }
            >
              <button
                className={`audio-clip ${isSelected ? "is-selected" : ""}`}
                type="button"
                onClick={() => onToggleClip(clip.id)}
                aria-pressed={isSelected}
                aria-label={`${clip.name}，${clip.duration} 秒`}
              >
                <span className="clip-name">{clip.name}</span>
                <span className="waveform" aria-hidden="true">
                  {clip.emphasis.map((height, index) => (
                    <i
                      key={index}
                      style={{ height: `${Math.round(height * 100)}%` }}
                    />
                  ))}
                </span>
              </button>
              <button
                className={`clip-audition ${auditioningClipId === clip.id ? "is-playing" : ""}`}
                type="button"
                disabled={!canAudition}
                aria-label={
                  canAudition
                    ? `${auditioningClipId === clip.id ? "暂停" : "试听"}${clip.name}`
                    : `${clip.name}还没有可试听音频`
                }
                onClick={() => void onAuditionClip(clip)}
              >
                {auditioningClipId === clip.id ? "Ⅱ" : "▶"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
