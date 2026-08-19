import { useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import type { QueueItem } from "../../services/api";
import type { QueueItemStatus } from "../../types/queue";
import { queueItemTypeLabels, queueItemTypeMarks } from "./queueItemConstants";

type QueueItemCardProps = {
  item: QueueItem;
  index: number;
  onStatusChange: (id: string, status: QueueItemStatus) => void;
  onRemove: (id: string) => void;
};

export function QueueItemCard({
  item,
  index,
  onStatusChange,
  onRemove,
}: QueueItemCardProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const showImage = Boolean(item.imageUrl && !imageUnavailable);

  return (
    <article
      className={`queue-item-card tone-${item.type}`}
      style={{ "--delay": `${index * 45}ms` } as CSSProperties}
    >
      <div
        className={`card-visual${showImage ? " has-image" : ""}`}
        aria-hidden="true"
      >
        {showImage && (
          <img
            className="card-artwork"
            src={item.imageUrl}
            alt=""
            onError={() => setImageUnavailable(true)}
          />
        )}
        <span className="item-mark">{queueItemTypeMarks[item.type]}</span>
        {!showImage && (
          <span className="item-initial" aria-hidden="true">
            {item.title.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="visual-type">{queueItemTypeLabels[item.type]}</span>
      </div>
      <div className="card-content">
        <div className="card-meta">
          <span>{queueItemTypeLabels[item.type]}</span>
          {item.year && <span>{item.year}</span>}
        </div>
        <h3>{item.title}</h3>
        <p>{item.notes || "No notes"}</p>
        <div className="card-actions">
          <label>
            <span className="sr-only">Status for {item.title}</span>
            <select
              className={`status-select status-${item.status.replace(" ", "-")}`}
              value={item.status}
              onChange={(event) =>
                onStatusChange(item._id, event.target.value as QueueItemStatus)
              }
            >
              <option value="backlog">Backlog</option>
              <option value="in progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            className="remove-button"
            onClick={() => onRemove(item._id)}
            aria-label={`Remove ${item.title}`}
            title="Remove item"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
