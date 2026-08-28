import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  onNotifications: () => void;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  onNotifications,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-actions">
        {actions}
        <button
          className="icon-button notification-button"
          type="button"
          onClick={onNotifications}
          aria-label="查看通知"
        >
          <span aria-hidden="true">◌</span>
          <i aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
