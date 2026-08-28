import type { GenerationMode } from "../types";

type StudioToolbarProps = {
  mode: GenerationMode;
  hasSelection: boolean;
  zoom: number;
  onModeChange: (mode: GenerationMode) => void;
  onZoomChange: (zoom: number) => void;
  stemStatus?: "idle" | "running" | "ready" | "failed";
};

const modes: Array<{ id: GenerationMode; label: string; note: string }> = [
  { id: "full", label: "整首生成", note: "使用整首作品作为操作范围" },
  { id: "region", label: "局部重绘", note: "仅修改时间线上选中的片段" },
  { id: "extend", label: "续写延展", note: "从当前结构继续写下去" },
  { id: "rearrange", label: "重新编曲", note: "保留核心素材，重做配器" },
];

export function StudioToolbar({
  mode,
  hasSelection,
  zoom,
  onModeChange,
  onZoomChange,
  stemStatus = "idle",
}: StudioToolbarProps) {
  const selectedMode = modes.find((item) => item.id === mode) ?? modes[0];
  return (
    <div className="studio-toolbar">
      <label className="mode-select">
        <span>生成模式</span>
        <select
          value={mode}
          onChange={(event) =>
            onModeChange(event.currentTarget.value as GenerationMode)
          }
        >
          <option value="full">整首生成</option>
          <option value="region" disabled>
            局部重绘（待接通）
          </option>
          <option value="extend" disabled>
            续写延展（待接通）
          </option>
          <option value="rearrange" disabled>
            重新编曲（请使用参考音频）
          </option>
        </select>
        <small>{selectedMode.note}</small>
      </label>
      <div className="scope-indicator">
        <span className={hasSelection ? "is-selected" : ""} aria-hidden="true">
          ⌖
        </span>
        <div>
          <small>当前范围</small>
          <strong>{hasSelection ? "已选择真实范围" : "整首作品"}</strong>
        </div>
      </div>
      <div className="toolbar-spacer" />
      <label className="zoom-control">
        <span aria-hidden="true">−</span>
        <span className="sr-only">时间线缩放</span>
        <input
          type="range"
          min="70"
          max="140"
          value={zoom}
          onChange={(event) => onZoomChange(Number(event.currentTarget.value))}
        />
        <span aria-hidden="true">＋</span>
        <output>{zoom}%</output>
      </label>
      <span className={`stem-readiness is-${stemStatus}`}>
        {stemStatus === "ready"
          ? "完整混音 · 4 条真实分轨"
          : stemStatus === "running"
            ? "正在生成真实分轨"
            : stemStatus === "failed"
              ? "完整混音 · 分轨可重试"
              : "完整混音 · 分轨未准备"}
      </span>
    </div>
  );
}
