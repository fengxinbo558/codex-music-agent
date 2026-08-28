import { PageHeader } from "../components/PageHeader";
import {
  initialTasks,
  projectTemplates,
  recentProjects,
} from "../data/productData";
import type { MusicEngineStatus } from "../types";

type ProjectsViewProps = {
  onOpenStudio: () => void;
  onNewProject: () => void;
  onNotifications: () => void;
  musicEngineStatus: MusicEngineStatus;
};

export function ProjectsView({
  onOpenStudio,
  onNewProject,
  onNotifications,
  musicEngineStatus,
}: ProjectsViewProps) {
  return (
    <main className="page-scroll" aria-labelledby="projects-title">
      <PageHeader
        eyebrow="YOUR MUSIC WORKSPACE"
        title="项目"
        description="把一句想法持续做成可修改、可比较、可导出的作品。"
        onNotifications={onNotifications}
        actions={
          <button
            className="primary-action"
            type="button"
            onClick={onNewProject}
          >
            ＋ 新建作品
          </button>
        }
      />
      <section className="continue-project" aria-labelledby="projects-title">
        <div className="continue-copy">
          <span className="section-kicker">继续制作</span>
          <h2 id="projects-title">雨停以前</h2>
          <p>
            副歌已经完成一次重编。下一步可以试听版本 03，或让 Agent
            继续收紧鼓组与和声。
          </p>
          <dl>
            <div>
              <dt>速度</dt>
              <dd>92 BPM</dd>
            </div>
            <div>
              <dt>调性</dt>
              <dd>C major</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>03</dd>
            </div>
          </dl>
          <button
            className="primary-action"
            type="button"
            onClick={onOpenStudio}
          >
            打开创作台 <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="continue-wave" aria-label="作品波形预览">
          <div className="cover-monogram">
            <span>雨</span>
            <small>BEFORE THE RAIN STOPS</small>
          </div>
          <div className="dashboard-wave" aria-hidden="true">
            {Array.from({ length: 74 }, (_, index) => (
              <i
                key={index}
                style={{ height: `${18 + ((index * 17) % 64)}%` }}
              />
            ))}
          </div>
          <span className="continue-time">01:36</span>
        </div>
      </section>
      <section className="readiness-strip" aria-label="系统准备情况">
        <div>
          <i className="is-ready" />
          <span>
            <strong>音乐制作助理</strong>
            <small>已连接 · 负责理解与调度</small>
          </span>
        </div>
        <div>
          <i
            className={
              musicEngineStatus === "ready" ? "is-ready" : "is-pending"
            }
          />
          <span>
            <strong>ACE-Step 音乐模型</strong>
            <small>
              {musicEngineStatus === "ready"
                ? "已连接 · 本机真实生成"
                : musicEngineStatus === "preparing"
                  ? "首次加载模型 · 正在准备"
                  : musicEngineStatus === "checking"
                    ? "正在检查本地服务"
                    : "未启动 · 等待本地服务"}
            </small>
          </span>
        </div>
        <div>
          <i className="is-demo" />
          <span>
            <strong>演示兜底</strong>
            <small>模型离线时只验证生成链路</small>
          </span>
        </div>
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-title">
          <div>
            <span className="section-kicker">START</span>
            <h2>用什么开始</h2>
          </div>
          <button type="button" onClick={onNewProject}>
            查看全部模板 →
          </button>
        </div>
        <div className="template-grid">
          {projectTemplates.map((template) => (
            <button key={template.id} type="button" onClick={onNewProject}>
              <span aria-hidden="true">{template.glyph}</span>
              <strong>{template.name}</strong>
              <small>{template.description}</small>
              <i aria-hidden="true">↗</i>
            </button>
          ))}
        </div>
      </section>
      <div className="dashboard-split">
        <section className="dashboard-section recent-projects-section">
          <div className="dashboard-section-title">
            <div>
              <span className="section-kicker">RECENT</span>
              <h2>最近项目</h2>
            </div>
          </div>
          <div className="project-table" role="table" aria-label="最近项目">
            {recentProjects.map((project) => (
              <button
                role="row"
                key={project.id}
                type="button"
                onClick={onOpenStudio}
              >
                <span
                  className="project-art"
                  style={{ borderColor: project.accent }}
                >
                  <i style={{ background: project.accent }} />
                </span>
                <span role="cell">
                  <strong>{project.title}</strong>
                  <small>{project.genre}</small>
                </span>
                <span role="cell">
                  <strong>{project.bpm}</strong>
                  <small>BPM</small>
                </span>
                <span role="cell">
                  <strong>{project.musicKey}</strong>
                  <small>{project.duration}</small>
                </span>
                <span role="cell">
                  <small>{project.updatedAt}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
        <section className="dashboard-section activity-section">
          <div className="dashboard-section-title">
            <div>
              <span className="section-kicker">ACTIVITY</span>
              <h2>最近任务</h2>
            </div>
          </div>
          <ol>
            {initialTasks.map((task) => (
              <li key={task.id}>
                <i className={`task-dot is-${task.status}`} />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.detail}</small>
                </span>
                <time>{task.time}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
