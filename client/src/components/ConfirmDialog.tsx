import { useEffect } from "react";
import { X } from "lucide-react";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="dialog confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close confirmation"
          disabled={busy}
        >
          <X size={21} aria-hidden="true" />
        </button>
        <p className="section-kicker">Remove from backlog</p>
        <h2 id="confirmation-title">{title}</h2>
        <p id="confirmation-message" className="confirmation-message">
          {message}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={busy}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Removing…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
