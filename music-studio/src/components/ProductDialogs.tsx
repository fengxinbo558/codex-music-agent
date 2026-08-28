import { useState, type FormEvent } from "react";

import type { MusicEngineStatus, ProjectVersion } from "../types";
import { Modal } from "./Modal";

export function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, source: string) => void;
}) {
  const [title, setTitle] = useState("未命名作品");
  const [source, setSource] = useState("idea");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate(title.trim() || "未命名作品", source);
  };
  return (
    <Modal
      title="新建作品"
      description="先选择起点，之后可以随时补充参考音频、人声或歌词。"
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={submit}>
        <label>
          <span>作品名称</span>
          <input
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
        <fieldset>
          <legend>从哪里开始</legend>
          {[
            {
              id: "idea",
              icon: "✦",
              title: "一句想法",
              note: "让 Agent 整理故事、曲风与结构",
            },
            {
              id: "reference",
              icon: "≋",
              title: "参考音频",
              note: "先建立工程，随后导入音频",
            },
            {
              id: "vocal",
              icon: "◉",
              title: "人声小样",
              note: "围绕旋律制作伴奏与编曲",
            },
          ].map((item) => (
            <label
              key={item.id}
              className={`source-choice ${source === item.id ? "is-selected" : ""}`}
            >
              <input
                type="radio"
                name="source"
                value={item.id}
                checked={source === item.id}
                onChange={() => setSource(item.id)}
              />
              <i aria-hidden="true">{item.icon}</i>
              <span>
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="dialog-hint">
          <span aria-hidden="true">◇</span> 新作品会使用非破坏式版本管理，Agent
          的每次生成都会另存为新版本。
        </p>
        <footer>
          <button className="secondary-action" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-action" type="submit">
            创建并进入创作台 →
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function ExportDialog({
  hasAudio,
  projectTitle,
  onClose,
  onExport,
}: {
  hasAudio: boolean;
  projectTitle: string;
  onClose: () => void;
  onExport: () => void;
}) {
  const [format, setFormat] = useState("wav");
  return (
    <Modal
      title="导出作品"
      description={`从《${projectTitle}》的当前版本创建文件。`}
      onClose={onClose}
    >
      <div className="export-dialog">
        <fieldset>
          <legend>音频格式</legend>
          <label className={format === "wav" ? "is-selected" : ""}>
            <input
              type="radio"
              name="format"
              value="wav"
              checked={format === "wav"}
              onChange={() => setFormat("wav")}
            />
            <span>
              <strong>WAV</strong>
              <small>无损试听 · 当前可用</small>
            </span>
          </label>
          <label className={format === "mp3" ? "is-selected" : ""}>
            <input
              type="radio"
              name="format"
              value="mp3"
              checked={format === "mp3"}
              onChange={() => setFormat("mp3")}
              disabled
            />
            <span>
              <strong>MP3</strong>
              <small>正式编码器接入后开放</small>
            </span>
          </label>
          <label>
            <input type="radio" name="format" value="stems" disabled />
            <span>
              <strong>分轨 Stems</strong>
              <small>需要正式音乐模型或 Demucs</small>
            </span>
          </label>
        </fieldset>
        <div
          className={`export-readiness ${hasAudio ? "is-ready" : "is-blocked"}`}
        >
          <i />
          {hasAudio
            ? "当前试听音频已就绪，可以导出 WAV。"
            : "还没有可导出的音频。先在创作台生成一个试听版本。"}
        </div>
        <footer>
          <button className="secondary-action" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={!hasAudio || format !== "wav"}
            onClick={onExport}
          >
            导出 WAV
          </button>
        </footer>
      </div>
    </Modal>
  );
}

export function CompareDialog({
  versions,
  selectedVersion,
  onSelectVersion,
  onClose,
}: {
  versions: ProjectVersion[];
  selectedVersion: string;
  onSelectVersion: (versionId: string) => void;
  onClose: () => void;
}) {
  const primary =
    versions.find((version) => version.id === selectedVersion) ?? versions[0];
  const secondary =
    versions.find((version) => version.id !== primary.id) ?? primary;
  return (
    <Modal
      title="版本 A / B 对比"
      description="对比制作决策，不会覆盖任何一个版本。"
      onClose={onClose}
      size="large"
    >
      <div className="compare-grid">
        {[
          { marker: "A", version: primary },
          { marker: "B", version: secondary },
        ].map(({ marker, version }) => (
          <section key={marker}>
            <div className="compare-label">
              <span>{marker}</span>
              <div>
                <strong>{version.label}</strong>
                <small>{version.createdAt}</small>
              </div>
            </div>
            <div className="compare-wave" aria-hidden="true">
              {Array.from({ length: 42 }, (_, index) => (
                <i
                  key={index}
                  style={{
                    height: `${17 + ((index * (marker === "A" ? 19 : 13)) % 70)}%`,
                  }}
                />
              ))}
            </div>
            <h3>{version.note}</h3>
            <dl>
              <div>
                <dt>BPM</dt>
                <dd>{version.bpm ?? 92}</dd>
              </div>
              <div>
                <dt>调性</dt>
                <dd>{version.musicKey ?? "C major"}</dd>
              </div>
              <div>
                <dt>引擎</dt>
                <dd>{version.provider ?? "演示链路"}</dd>
              </div>
            </dl>
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                onSelectVersion(version.id);
                onClose();
              }}
            >
              设 {version.label} 为当前版本
            </button>
          </section>
        ))}
      </div>
      <footer className="compare-footer">
        <p>正式音乐引擎接入后，这里会支持同步播放与响度匹配。</p>
        <button className="primary-action" type="button" onClick={onClose}>
          完成对比
        </button>
      </footer>
    </Modal>
  );
}

export function InstallPlanDialog({
  musicEngineStatus,
  onClose,
}: {
  musicEngineStatus: MusicEngineStatus;
  onClose: () => void;
}) {
  return (
    <Modal
      title="本地音乐引擎安装计划"
      description="ACE-Step 已按本地 Provider 方式接入；这里显示当前运行状态和首次准备流程。"
      onClose={onClose}
      size="large"
    >
      <ol className="install-steps">
        <li>
          <span>01</span>
          <div>
            <strong>检测机器与显存</strong>
            <p>确认系统、GPU/统一内存、磁盘空间和 Python 运行环境。</p>
          </div>
          <em>已完成</em>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>安装 ACE-Step 运行时与权重</strong>
            <p>使用官方 MIT 开源运行时；首次生成下载权重并建立本机缓存。</p>
          </div>
          <em>{musicEngineStatus === "ready" ? "服务可用" : "准备中"}</em>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>启动本地推理服务</strong>
            <p>通过独立 Provider 适配层连接，不把模型代码塞进 UI。</p>
          </div>
          <em>{musicEngineStatus === "ready" ? "已启动" : "待启动"}</em>
        </li>
        <li>
          <span>04</span>
          <div>
            <strong>质量与性能校准</strong>
            <p>用固定提示词检测生成时长、显存占用、歌词和人声质量。</p>
          </div>
          <em>进行中</em>
        </li>
      </ol>
      <div className="install-note">
        <strong>现在的状态</strong>
        <p>
          {musicEngineStatus === "ready"
            ? "ACE-Step 本地服务已连接。点击生成时会优先制作真实音乐，演示合成器只保留为离线兜底。"
            : "本地服务尚未就绪。桌面应用会自动启动；第一次生成需要下载官方权重，完成后会自动切换到真实音乐。"}
        </p>
      </div>
      <footer className="dialog-footer">
        <button className="primary-action" type="button" onClick={onClose}>
          我知道了
        </button>
      </footer>
    </Modal>
  );
}

export function NotificationsDialog({
  musicEngineStatus,
  onClose,
}: {
  musicEngineStatus: MusicEngineStatus;
  onClose: () => void;
}) {
  return (
    <Modal title="通知" description="最近的系统和作品状态。" onClose={onClose}>
      <ol className="notification-list">
        <li>
          <i className="is-ready" />
          <span>
            <strong>版本 03 已可试听</strong>
            <small>演示合成器已完成 WAV 输出 · 刚刚</small>
          </span>
        </li>
        <li>
          <i
            className={
              musicEngineStatus === "ready" ? "is-ready" : "is-pending"
            }
          />
          <span>
            <strong>
              {musicEngineStatus === "ready"
                ? "ACE-Step 已连接"
                : "ACE-Step 正在准备"}
            </strong>
            <small>
              {musicEngineStatus === "ready"
                ? "真实音乐将优先在本机生成 · 现在"
                : "首次运行需要下载并加载模型 · 现在"}
            </small>
          </span>
        </li>
        <li>
          <i className="is-ready" />
          <span>
            <strong>Codex Agent 连接正常</strong>
            <small>可以读取工程并制定制作计划 · 今天</small>
          </span>
        </li>
      </ol>
      <footer className="dialog-footer">
        <button className="primary-action" type="button" onClick={onClose}>
          关闭
        </button>
      </footer>
    </Modal>
  );
}
