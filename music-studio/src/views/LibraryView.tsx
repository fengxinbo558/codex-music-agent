import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "../components/PageHeader";
import type { MusicAsset } from "../types";

type LibraryViewProps = {
  assets: MusicAsset[];
  assetsReady: boolean;
  playingAssetId: string | null;
  isPlaying: boolean;
  onImportFiles: (files: File[]) => void | Promise<void>;
  onTogglePlayback: (asset: MusicAsset) => void | Promise<void>;
  onToggleFavorite: (asset: MusicAsset) => void | Promise<void>;
  currentReferenceId: string;
  onUseAsReference: (asset: MusicAsset) => void;
  onNotifications: () => void;
};

type AssetFilter = "all" | MusicAsset["type"] | "favorite";

const filters: Array<{ id: AssetFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "generated", label: "生成结果" },
  { id: "reference", label: "参考音频" },
  { id: "vocal", label: "人声" },
  { id: "loop", label: "Loop" },
  { id: "recording", label: "录音" },
  { id: "favorite", label: "收藏" },
];

export function LibraryView({
  assets,
  assetsReady,
  playingAssetId,
  isPlaying,
  onImportFiles,
  onTogglePlayback,
  onToggleFavorite,
  currentReferenceId,
  onUseAsReference,
  onNotifications,
}: LibraryViewProps) {
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(assets[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "favorite" ? asset.favorite : asset.type === filter);
        return (
          matchesFilter &&
          asset.name.toLowerCase().includes(query.trim().toLowerCase())
        );
      }),
    [assets, filter, query],
  );
  const selected = assets.find((asset) => asset.id === selectedId);

  useEffect(() => {
    if (!assets.length) {
      setSelectedId("");
      return;
    }
    if (!assets.some((asset) => asset.id === selectedId)) {
      setSelectedId(assets[0].id);
    }
  }, [assets, selectedId]);

  const isAssetPlaying = (asset: MusicAsset) =>
    playingAssetId === asset.id && isPlaying;

  return (
    <main className="page-scroll library-page" aria-labelledby="library-title">
      <PageHeader
        eyebrow="SOURCE MATERIAL"
        title="真实音频库"
        description="导入的参考音频和 AI 生成结果会真实保存在本机，刷新后仍然可播放。"
        onNotifications={onNotifications}
        actions={
          <>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                void onImportFiles(files);
              }}
            />
            <button
              className="primary-action"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              ↑ 导入真实音频
            </button>
          </>
        }
      />
      <section className="library-toolbar" aria-label="素材筛选">
        <div className="filter-tabs">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span>
                {item.id === "all"
                  ? assets.length
                  : assets.filter((asset) =>
                      item.id === "favorite"
                        ? asset.favorite
                        : asset.type === item.id,
                    ).length}
              </span>
            </button>
          ))}
        </div>
        <label className="search-field">
          <span className="sr-only">搜索素材</span>
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜索真实音频"
          />
        </label>
      </section>
      <div className="library-layout">
        <section className="asset-browser" aria-label="素材列表">
          <div className="asset-table-head" aria-hidden="true">
            <span>名称</span>
            <span>时长</span>
            <span>BPM</span>
            <span>调性</span>
            <span>保存状态</span>
            <span>收藏</span>
          </div>
          {!assetsReady ? (
            <div className="empty-state" role="status">
              <span aria-hidden="true">◌</span>
              <strong>正在读取本机音频库</strong>
            </div>
          ) : filtered.length ? (
            filtered.map((asset) => (
              <div
                key={asset.id}
                className={`asset-row ${selectedId === asset.id ? "is-selected" : ""}`}
                onClick={() => setSelectedId(asset.id)}
              >
                <span className={`asset-type type-${asset.type}`}>
                  <button
                    className="asset-play-control"
                    type="button"
                    aria-label={`${isAssetPlaying(asset) ? "暂停" : "播放"}${asset.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onTogglePlayback(asset);
                    }}
                  >
                    {isAssetPlaying(asset) ? "Ⅱ" : "▶"}
                  </button>
                  <button
                    className="asset-name-control"
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                  >
                    <strong>{asset.name}</strong>
                    <small>{typeLabel(asset.type)} · {asset.origin}</small>
                  </button>
                </span>
                <span>{asset.duration}</span>
                <span>{asset.bpm ?? "—"}</span>
                <span>{asset.musicKey ?? "—"}</span>
                <span>{syncLabel(asset)}</span>
                <span>
                  <button
                    className="favorite-star"
                    type="button"
                    aria-label={asset.favorite ? "取消收藏" : "加入收藏"}
                    aria-pressed={asset.favorite}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onToggleFavorite(asset);
                    }}
                  >
                    {asset.favorite ? "★" : "☆"}
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">◇</span>
              <strong>
                {assets.length ? "没有匹配的真实音频" : "音频库还是空的"}
              </strong>
              <p>
                {assets.length
                  ? "换一个筛选条件。"
                  : "导入参考音频，或者生成第一首作品。"}
              </p>
            </div>
          )}
        </section>
        <aside className="asset-inspector" aria-label="素材详情">
          {selected ? (
            <>
              <div className="inspector-wave">
                <button
                  className="play-orb"
                  type="button"
                  aria-label={`${isAssetPlaying(selected) ? "暂停" : "播放"}${selected.name}`}
                  onClick={() => void onTogglePlayback(selected)}
                >
                  {isAssetPlaying(selected) ? "Ⅱ" : "▶"}
                </button>
                <div aria-hidden="true">
                  {selected.waveform.map((height, index) => (
                    <i
                      key={index}
                      style={{ height: `${Math.max(4, height * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
              <span className="section-kicker">REAL AUDIO ASSET</span>
              <h2>{selected.name}</h2>
              <p>
                {typeLabel(selected.type)} · {selected.origin}
              </p>
              <dl>
                <div>
                  <dt>时长</dt>
                  <dd>{selected.duration}</dd>
                </div>
                <div>
                  <dt>文件大小</dt>
                  <dd>{formatBytes(selected.size)}</dd>
                </div>
                <div>
                  <dt>BPM</dt>
                  <dd>{selected.bpm ?? "待分析"}</dd>
                </div>
                <div>
                  <dt>保存</dt>
                  <dd>{syncLabel(selected)}</dd>
                </div>
              </dl>
              <div className="inspector-actions">
                <button
                  className="primary-action"
                  type="button"
                  aria-pressed={currentReferenceId === selected.id}
                  onClick={() => onUseAsReference(selected)}
                >
                  {currentReferenceId === selected.id
                    ? "当前参考音频"
                    : "用它参考风格"}
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void onTogglePlayback(selected)}
                >
                  {isAssetPlaying(selected) ? "暂停试听" : "试听完整音频"}
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void onToggleFavorite(selected)}
                >
                  {selected.favorite ? "取消收藏" : "收藏素材"}
                </button>
              </div>
              <div className="analysis-note">
                <span>真实文件</span>
                <p>
                  已保存 {selected.mimeType || "音频"} 二进制内容和真实波形。
                  {selected.syncState === "local"
                    ? " 当前仅在这台设备保存，云同步将在下一阶段接入。"
                    : " 该素材已进入同步流程。"}
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>选择一个真实音频</strong>
              <p>右侧会显示它的真实波形、参数和播放控制。</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function typeLabel(type: MusicAsset["type"]) {
  return {
    reference: "参考音频",
    vocal: "人声小样",
    loop: "Loop",
    recording: "现场录音",
    generated: "AI 生成结果",
  }[type];
}

function syncLabel(asset: MusicAsset) {
  return {
    local: "本机已保存",
    queued: "等待同步",
    uploading: `正在同步 ${Math.round(asset.syncProgress ?? 0)}%`,
    synced: "云端已同步",
    failed: "同步失败",
  }[asset.syncState];
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
