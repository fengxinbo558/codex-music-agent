import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "large";
};

export function Modal({
  title,
  description,
  onClose,
  children,
  size = "small",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
      const preferred = dialog.querySelector<HTMLElement>("[data-autofocus]");
      preferred?.focus();
    }
    return () => previousFocus?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal-${size}`}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-surface">
        <header>
          <div>
            <span className="section-kicker">MUSIC WORKROOM</span>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description">{description}</p> : null}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="关闭对话框"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
