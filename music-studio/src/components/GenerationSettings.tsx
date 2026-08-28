import { useState } from "react";

import {
  CREATIVITY_LABELS,
  estimateGenerationTime,
  getContentFitNotice,
  LYRIC_CLARITY_LABELS,
  LYRICS_MODE_LABELS,
  summarizePreferences,
  VOCAL_STYLE_LABELS,
} from "../data/generationPreferences";
import { TONE_PROFILES } from "../data/toneProfiles";
import { VOCAL_DELIVERY_PROFILES } from "../data/vocalDelivery";
import type {
  CreativityLevel,
  GenerationDuration,
  GenerationPreferences,
  LyricClarity,
  LyricsMode,
  ToneProfile,
  VocalDelivery,
  VocalStyle,
} from "../types";

type GenerationSettingsProps = {
  preferences: GenerationPreferences;
  disabled: boolean;
  promptCharacters: number;
  currentLyricsCharacters: number;
  onChange: (preferences: GenerationPreferences) => void;
};

export function GenerationSettings({
  preferences,
  disabled,
  promptCharacters,
  currentLyricsCharacters,
  onChange,
}: GenerationSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const update = <Key extends keyof GenerationPreferences>(
    key: Key,
    value: GenerationPreferences[Key],
  ) => onChange({ ...preferences, [key]: value });
  const contentFitNotice = getContentFitNotice(
    preferences,
    promptCharacters,
    currentLyricsCharacters,
  );

  return (
    <section className="generation-settings" aria-label="歌曲生成设置">
      <button
        className="recipe-strip"
        type="button"
        aria-expanded={expanded}
        aria-controls="generation-settings-detail"
        onClick={() => setExpanded((value) => !value)}
        disabled={disabled}
      >
        <span aria-hidden="true">⌁</span>
        <span>
          <small>这次怎么做</small>
          <strong>{summarizePreferences(preferences)}</strong>
        </span>
        <span className="recipe-estimate">
          {estimateGenerationTime(preferences)}
          <i aria-hidden="true">{expanded ? "−" : "+"}</i>
        </span>
      </button>

      {expanded ? (
        <div id="generation-settings-detail" className="settings-detail">
          <ChoiceGroup<GenerationDuration>
            legend="歌曲时长"
            name="duration"
            value={preferences.duration}
            options={[
              { value: 30, label: "30 秒" },
              { value: 60, label: "60 秒" },
              { value: 90, label: "90 秒" },
            ]}
            disabled={disabled}
            onChange={(value) => update("duration", value)}
          />
          <ChoiceGroup<VocalStyle>
            legend="演唱方式"
            name="vocal-style"
            value={preferences.vocalStyle}
            options={Object.entries(VOCAL_STYLE_LABELS).map(
              ([value, label]) => ({ value: value as VocalStyle, label }),
            )}
            disabled={disabled}
            onChange={(value) => update("vocalStyle", value)}
          />
          <VocalDeliveryChoice
            value={preferences.vocalDelivery}
            disabled={disabled || preferences.vocalStyle === "instrumental"}
            onChange={(value) => update("vocalDelivery", value)}
          />
          <ChoiceGroup<LyricClarity>
            legend="歌词清晰度"
            name="lyric-clarity"
            value={preferences.lyricClarity}
            options={Object.entries(LYRIC_CLARITY_LABELS).map(
              ([value, label]) => ({ value: value as LyricClarity, label }),
            )}
            disabled={disabled || preferences.vocalStyle === "instrumental"}
            onChange={(value) => update("lyricClarity", value)}
          />
          <ChoiceGroup<LyricsMode>
            legend="歌词"
            name="lyrics-mode"
            value={preferences.lyricsMode}
            options={Object.entries(LYRICS_MODE_LABELS).map(
              ([value, label]) => ({ value: value as LyricsMode, label }),
            )}
            disabled={disabled || preferences.vocalStyle === "instrumental"}
            onChange={(value) => update("lyricsMode", value)}
          />
          <ChoiceGroup<CreativityLevel>
            legend="创作幅度"
            name="creativity"
            value={preferences.creativity}
            options={Object.entries(CREATIVITY_LABELS).map(
              ([value, label]) => ({ value: value as CreativityLevel, label }),
            )}
            disabled={disabled}
            onChange={(value) => update("creativity", value)}
          />
          <ToneProfileChoice
            value={preferences.toneProfile}
            disabled={disabled}
            onChange={(value) => update("toneProfile", value)}
          />
          <ChoiceGroup<1 | 2>
            legend="生成数量"
            name="variant-count"
            value={preferences.variantCount}
            options={[
              { value: 1, label: "1 个版本" },
              { value: 2, label: "2 个版本" },
            ]}
            disabled={disabled}
            onChange={(value) => update("variantCount", value)}
          />
          <p className="settings-note">
            本机 ACE-Step 生成不按首收费；时长和版本越多，等待时间越长。
          </p>
        </div>
      ) : null}
      {contentFitNotice ? (
        <p className="content-fit-notice" role="status">
          <span aria-hidden="true">!</span>
          {contentFitNotice}
        </p>
      ) : null}
    </section>
  );
}

function VocalDeliveryChoice({
  value,
  disabled,
  onChange,
}: {
  value: VocalDelivery;
  disabled: boolean;
  onChange: (value: VocalDelivery) => void;
}) {
  return (
    <fieldset className="settings-choice vocal-delivery-choice">
      <legend>演唱状态</legend>
      <div>
        {Object.entries(VOCAL_DELIVERY_PROFILES).map(
          ([delivery, definition]) => (
            <label
              key={delivery}
              className={value === delivery ? "is-selected" : ""}
            >
              <input
                type="radio"
                name="vocal-delivery"
                value={delivery}
                checked={value === delivery}
                disabled={disabled}
                onChange={() => onChange(delivery as VocalDelivery)}
              />
              <span>
                <strong>{definition.label}</strong>
                <small>{definition.description}</small>
              </span>
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}

function ToneProfileChoice({
  value,
  disabled,
  onChange,
}: {
  value: ToneProfile;
  disabled: boolean;
  onChange: (value: ToneProfile) => void;
}) {
  return (
    <fieldset className="settings-choice tone-profile-choice">
      <legend>声音质感</legend>
      <div>
        {Object.entries(TONE_PROFILES).map(([profile, definition]) => (
          <label
            key={profile}
            className={value === profile ? "is-selected" : ""}
          >
            <input
              type="radio"
              name="tone-profile"
              value={profile}
              checked={value === profile}
              disabled={disabled}
              onChange={() => onChange(profile as ToneProfile)}
            />
            <span className="tone-profile-copy">
              <strong>{definition.label}</strong>
              <small>{definition.description}</small>
            </span>
            <span className="tone-fingerprint" aria-hidden="true">
              {definition.fingerprint.map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ChoiceGroup<Value extends string | number>({
  legend,
  name,
  value,
  options,
  disabled,
  onChange,
}: {
  legend: string;
  name: string;
  value: Value;
  options: Array<{ value: Value; label: string }>;
  disabled: boolean;
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className="settings-choice">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={value === option.value ? "is-selected" : ""}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
