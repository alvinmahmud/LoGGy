import { type FormEvent, useState } from "react";
import { X } from "lucide-react";
import type {
  NewQueueItem,
  QueueItemStatus,
  QueueItemType,
} from "../../types/queue";

type AddQueueItemDialogProps = {
  onAdd: (item: NewQueueItem) => Promise<void>;
  onClose: () => void;
};

export function AddQueueItemDialog({ onAdd, onClose }: AddQueueItemDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QueueItemType>("game");
  const [status, setStatus] = useState<QueueItemStatus>("backlog");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      await onAdd({
        title: title.trim(),
        type,
        status,
        year: year.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} aria-hidden="true" />
        </button>
        <p className="section-kicker">Add to queue</p>
        <h2 id="dialog-title">Add a title</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Cyberpunk 2077"
            />
          </label>
          <div className="field-pair">
            <label className="field">
              <span>Media type</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as QueueItemType)
                }
              >
                <option value="game">Game</option>
                <option value="movie">Movie</option>
                <option value="tv">TV show</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as QueueItemStatus)
                }
              >
                <option value="backlog">Backlog</option>
                <option value="in progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>
              Release year <em>optional</em>
            </span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={year}
              onChange={(event) =>
                setYear(event.target.value.replace(/\D/g, ""))
              }
              placeholder="2024"
            />
          </label>
          <label className="field">
            <span>
              Note <em>optional</em>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note"
              rows={3}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-button" disabled={saving}>
              {saving ? "Saving…" : "Add to queue"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
