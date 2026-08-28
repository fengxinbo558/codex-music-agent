import { PageHeader } from "../components/PageHeader";
import { modelConnections } from "../data/productData";
import type { ModelConnection, MusicEngineStatus } from "../types";

type ModelsViewProps = {
  voiceAvailable: boolean;
  musicEngineStatus: MusicEngineStatus;
  localAudioStatus: "checking" | "ready" | "offline";
  onInstallPlan: () => void;
  onNotifications: () => void;
  onAnnounce: (message: string) => void;
};

export function ModelsView({
  voiceAvailable,
  musicEngineStatus,
  localAudioStatus,
  onInstallPlan,
  onNotifications,
  onAnnounce,
}: ModelsViewProps) {
  const models = modelConnections.map((model) =>
    model.id === "ace-step"
      ? {
          ...model,
          status:
            musicEngineStatus === "ready"
              ? ("ready" as const)
              : musicEngineStatus === "preparing" ||
                  musicEngineStatus === "checking"
                ? ("preparing" as const)
                : ("offline" as const),
          runtime:
            musicEngineStatus === "ready"
              ? "Apple Silicon · MLX · 本机 8001"
              : musicEngineStatus === "preparing"
                ? "正在下载或加载本地模型"
                : "本地服务未启动",
          note:
            musicEngineStatus === "ready"
              ? "真实音乐生成引擎已连接；生成会优先走本机，不产生按次 API 费用。"
              : musicEngineStatus === "preparing"
                ? "服务已启动，正在完成第一次模型准备；完成后会自动切换为真实音乐生成。"
                : "本地运行时已预留；服务未启动时只会生成链路试听。",
        }
      : model.id === "demucs"
        ? {
            ...model,
            name: "真实分轨与人声编辑",
            status:
              localAudioStatus === "ready"
                ? ("ready" as const)
                : localAudioStatus === "checking"
                  ? ("preparing" as const)
                  : ("offline" as const),
            runtime:
              localAudioStatus === "ready"
                ? "Demucs + 基频分析 · 本机 8002"
                : localAudioStatus === "checking"
                  ? "正在检查本机音频服务"
                  : "本机音频服务未启动",
            note:
              localAudioStatus === "ready"
                ? "真实四分轨、逐句基频检测、音高移动和重新混音均可用。"
                : "服务未启动时保留完整混音，不会显示假分轨或假音高编辑。",
            capabilities: ["四轨分离", "基频检测", "音高升降", "重新混音"],
          }
        : model.id === "speech"
        ? {
            ...model,
            status: voiceAvailable
              ? ("ready" as const)
              : ("unconfigured" as const),
            note: voiceAvailable
              ? model.note
              : "当前浏览器环境未开放语音听写，可继续使用文字输入。",
          }
        : model,
  );
  return (
    <main className="page-scroll models-page" aria-labelledby="models-title">
      <PageHeader
        eyebrow="MODEL ROUTING"
        title="模型中心"
        description="Agent 负责思考和调度；音乐、音频与输入模型各自独立，可随时替换。"
        onNotifications={onNotifications}
      />
      <section className="architecture-line" aria-labelledby="models-title">
        <div className="architecture-node node-input">
          <span>你的想法</span>
          <small>文字 / 语音 / 参考音频</small>
        </div>
        <i aria-hidden="true">→</i>
        <div className="architecture-node node-agent">
          <span>音乐制作助理</span>
          <small>理解 · 计划 · 调用工具</small>
        </div>
        <i aria-hidden="true">→</i>
        <div className="architecture-node node-music">
          <span>音乐引擎</span>
          <small>ACE-Step / 云端 API</small>
        </div>
        <i aria-hidden="true">→</i>
        <div className="architecture-node node-output">
          <span>作品工程</span>
          <small>音轨 · 版本 · 导出</small>
        </div>
      </section>
      <section className="model-group">
        <div className="model-group-heading">
          <div>
            <span className="section-kicker">AGENT BRAIN</span>
            <h2>智能代理</h2>
          </div>
          <p>不是音乐大模型；它读取工程、拆解任务、调用真正的音乐引擎。</p>
        </div>
        {models
          .filter((model) => model.role === "agent")
          .map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              onInstallPlan={onInstallPlan}
              onAnnounce={onAnnounce}
            />
          ))}
      </section>
      <section className="model-group">
        <div className="model-group-heading">
          <div>
            <span className="section-kicker">MUSIC & AUDIO</span>
            <h2>音乐与音频引擎</h2>
          </div>
          <p>同一份 Agent 计划可以路由到本地模型或云端 API。</p>
        </div>
        <div className="model-list">
          {models
            .filter((model) => model.role === "music" || model.role === "audio")
            .map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                onInstallPlan={onInstallPlan}
                onAnnounce={onAnnounce}
              />
            ))}
        </div>
      </section>
      <section className="model-group">
        <div className="model-group-heading">
          <div>
            <span className="section-kicker">INPUT</span>
            <h2>输入能力</h2>
          </div>
          <p>口述只负责把想法变成文字，不等于合成歌手声音。</p>
        </div>
        {models
          .filter((model) => model.role === "input")
          .map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              onInstallPlan={onInstallPlan}
              onAnnounce={onAnnounce}
            />
          ))}
      </section>
      <section className="capability-matrix" aria-label="能力分工表">
        <div>
          <span>能力</span>
          <span>制作助理</span>
          <span>演示引擎</span>
          <span>ACE-Step</span>
          <span>Demucs</span>
        </div>
        {[
          ["理解创作想法", "●", "—", "—", "—"],
          ["生成完整音乐", "调度", "试听级", "●", "—"],
          ["歌词演唱", "调度", "—", "●", "—"],
          ["局部重绘", "调度", "模拟", "●", "—"],
          ["人声伴奏分离", "调度", "—", "—", "●"],
        ].map((row) => (
          <div key={row[0]}>
            {row.map((cell, index) => (
              <span key={index}>{cell}</span>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}

function ModelRow({
  model,
  onInstallPlan,
  onAnnounce,
}: {
  model: ModelConnection;
  onInstallPlan: () => void;
  onAnnounce: (message: string) => void;
}) {
  const labels = {
    "connected": "已连接",
    "ready": "可用",
    "preparing": "准备中",
    "offline": "未启动",
    "not-installed": "待安装",
    "unconfigured": "未配置",
  };
  return (
    <article className={`model-row status-${model.status}`}>
      <div className="model-symbol" aria-hidden="true">
        {model.role === "agent" ? "♪" : model.role === "input" ? "◉" : "≈"}
      </div>
      <div className="model-copy">
        <div>
          <h3>{model.name}</h3>
          <span className={`status-badge status-${model.status}`}>
            <i />
            {labels[model.status]}
          </span>
        </div>
        <p>{model.note}</p>
        <small>{model.runtime}</small>
      </div>
      <ul aria-label={`${model.name} 能力`}>
        {model.capabilities.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>
      {model.status === "not-installed" ? (
        <button
          className="secondary-action"
          type="button"
          onClick={onInstallPlan}
        >
          查看安装计划
        </button>
      ) : model.status === "preparing" ? (
        <button className="secondary-action" type="button" disabled>
          首次准备中
        </button>
      ) : model.status === "unconfigured" ? (
        <button
          className="secondary-action"
          type="button"
          onClick={() =>
            onAnnounce(
              `${model.name} 的配置入口已预留，正式接入时需要填写服务密钥`,
            )
          }
        >
          配置
        </button>
      ) : (
        <button
          className="text-action"
          type="button"
          onClick={() =>
            onAnnounce(
              model.status === "offline"
                ? `${model.name} 当前未启动，桌面应用会自动尝试启动`
                : `${model.name} 连接正常`,
            )
          }
        >
          检查连接
        </button>
      )}
    </article>
  );
}
