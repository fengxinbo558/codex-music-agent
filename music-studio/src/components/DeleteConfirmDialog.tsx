import { Modal } from "./Modal";

type DeleteConfirmDialogProps = {
  itemName: string;
  detail: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmDialog({
  itemName,
  detail,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Modal
      title={`删除《${itemName}》？`}
      description="删除后无法从本机恢复。仍被其他版本使用的音频不会被误删。"
      onClose={onCancel}
    >
      <div className="delete-confirm-body">
        <span aria-hidden="true">⌫</span>
        <p>{detail}</p>
      </div>
      <footer className="delete-confirm-actions">
        <button className="secondary-action" type="button" onClick={onCancel}>
          保留
        </button>
        <button
          className="danger-action"
          type="button"
          data-autofocus
          onClick={() => void onConfirm()}
        >
          确认删除
        </button>
      </footer>
    </Modal>
  );
}
