import type {
  GenerationReferenceSettings,
  MusicAsset,
  ReferenceMode,
} from "../types";

type ReferenceAudioControlsProps = {
  assets: MusicAsset[];
  settings: GenerationReferenceSettings;
  disabled: boolean;
  onChange: (settings: GenerationReferenceSettings) => void;
  onOpenLibrary: () => void;
};

const modes: Array<{
  id: ReferenceMode;
  label: string;
  short: string;
}> = [
  { id: "none", label: "不用参考音频", short: "自由生成" },
  { id: "style", label: "参考风格和氛围", short: "参考风格" },
  { id: "cover", label: "保留源音频骨架并重编", short: "翻唱 / 重编" },
];

export function ReferenceAudioControls({
  assets,
  settings,
  disabled,
  onChange,
  onOpenLibrary,
}: ReferenceAudioControlsProps) {
  const selected = assets.find((asset) => asset.id === settings.assetId);
  const setMode = (mode: ReferenceMode) => {
    onChange({
      mode,
      assetId:
        mode === "none" ? settings.assetId : selected?.id ?? assets[0]?.id ?? "",
      strength: mode === "style" ? 0.2 : mode === "cover" ? 0.68 : settings.strength,
    });
  };

  return (
    <section className="reference-controls" aria-labelledby="reference-heading">
      <div className="reference-heading-row">
        <div>
          <small id="reference-heading">参考音频</small>
          <strong>
            {settings.mode === "none"
              ? "不使用"
              : selected
                ? `${modeShort(settings.mode)} · ${selected.name}`
                : "请选择真实音频"}
          </strong>
        </div>
        <span aria-hidden="true">≋</span>
      </div>
      <div className="reference-mode-grid" role="group" aria-label="参考音频用法">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={settings.mode === mode.id ? "is-selected" : ""}
            aria-pressed={settings.mode === mode.id}
            disabled={disabled}
            onClick={() => setMode(mode.id)}
          >
            {mode.short}
          </button>
        ))}
      </div>
      {settings.mode !== "none" ? (
        assets.length ? (
          <div className="reference-detail">
            <label>
              <span>选择音频</span>
              <select
                value={settings.assetId}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...settings, assetId: event.currentTarget.value })
                }
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} · {asset.duration}
                  </option>
                ))}
              </select>
            </label>
            <label className="reference-strength">
              <span>
                {settings.mode === "style" ? "风格影响" : "源音频保留"}
                <output>{Math.round(settings.strength * 100)}%</output>
              </span>
              <input
                type="range"
                min={settings.mode === "style" ? 10 : 30}
                max={settings.mode === "style" ? 40 : 95}
                step={1}
                value={Math.round(settings.strength * 100)}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    strength: Number(event.currentTarget.value) / 100,
                  })
                }
              />
            </label>
            <p>
              {settings.mode === "style"
                ? "只借鉴氛围、配器和声音质感；20% 是模型建议起点。"
                : "保留原曲的节奏与旋律骨架，按你的文字要求重做配器与演唱。"}
            </p>
          </div>
        ) : (
          <div className="reference-empty">
            <span>还没有真实音频。</span>
            <button type="button" onClick={onOpenLibrary} disabled={disabled}>
              去素材库导入
            </button>
          </div>
        )
      ) : null}
    </section>
  );
}

function modeShort(mode: GenerationReferenceSettings["mode"]) {
  return modes.find((item) => item.id === mode)?.short ?? "自由生成";
}
