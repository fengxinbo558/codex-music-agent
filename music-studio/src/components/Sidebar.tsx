import type {
  AppView,
  MusicEngineStatus,
  ProjectSummary,
  ProjectVersion,
} from "../types";

type SidebarProps = {
  view: AppView;
  projects: ProjectSummary[];
  versions: ProjectVersion[];
  selectedVersion: string;
  musicEngineStatus: MusicEngineStatus;
  onNavigate: (view: AppView) => void;
  onNewProject: () => void;
  onSelectVersion: (versionId: string) => void;
};

const navItems: Array<{ id: AppView; label: string; glyph: string }> = [
  { id: "projects", label: "项目", glyph: "▦" },
  { id: "studio", label: "创作台", glyph: "⌁" },
  { id: "library", label: "素材库", glyph: "◇" },
  { id: "models", label: "模型中心", glyph: "◎" },
];

export function Sidebar({
  view,
  projects,
  versions,
  selectedVersion,
  musicEngineStatus,
  onNavigate,
  onNewProject,
  onSelectVersion,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="产品导航">
      <button
        className="brand-lockup"
        type="button"
        onClick={() => onNavigate("projects")}
      >
        <span className="brand-mark" aria-hidden="true">
          C/
        </span>
        <span>
          <strong>CODEX MUSIC</strong>
          <small>AGENT STUDIO</small>
        </span>
      </button>
      <button className="new-work-button" type="button" onClick={onNewProject}>
        <span aria-hidden="true">＋</span> 新建作品
      </button>
      <nav className="project-nav" aria-label="主要工作区">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? "is-active" : ""}`}
            type="button"
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span aria-hidden="true">{item.glyph}</span>
            {item.label}
          </button>
        ))}
      </nav>
      {view === "studio" ? (
        <section className="sidebar-section" aria-labelledby="versions-heading">
          <div className="section-label-row">
            <h2 id="versions-heading">当前工程版本</h2>
            <span>{versions.length}</span>
          </div>
          <div className="version-list">
            {versions.map((version) => (
              <button
                key={version.id}
                className={`version-item ${selectedVersion === version.id ? "is-selected" : ""}`}
                type="button"
                onClick={() => onSelectVersion(version.id)}
                aria-pressed={selectedVersion === version.id}
              >
                <span className="version-index">
                  {version.label.replace("版本 ", "")}
                </span>
                <span className="version-copy">
                  <strong>{version.note}</strong>
                  <small>{version.createdAt}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="sidebar-section" aria-labelledby="recent-heading">
          <div className="section-label-row">
            <h2 id="recent-heading">最近项目</h2>
            <span>{projects.length}</span>
          </div>
          <div className="recent-project-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onNavigate("studio")}
              >
                <i style={{ background: project.accent }} aria-hidden="true" />
                <span>
                  <strong>{project.title}</strong>
                  <small>{project.updatedAt}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <button
        className="provider-status"
        type="button"
        onClick={() => onNavigate("models")}
      >
        <span
          className={`status-dot ${musicEngineStatus === "ready" ? "is-ready" : "is-pending"}`}
          aria-hidden="true"
        />
        <span>
          <strong>
            {musicEngineStatus === "ready"
              ? "ACE-Step 已连接"
              : musicEngineStatus === "preparing"
                ? "ACE-Step 正在准备"
                : musicEngineStatus === "checking"
                  ? "正在检查音乐模型"
                  : "ACE-Step 未启动"}
          </strong>
          <small>
            {musicEngineStatus === "ready"
              ? "真实音乐 · 本机生成"
              : musicEngineStatus === "preparing"
                ? "首次加载模型，请稍候"
                : "未启动时仅生成链路试听"}
          </small>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}
