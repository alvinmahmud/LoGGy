import type { CSSProperties } from "react";
import { X } from "lucide-react";
import type { ApiMediaItem } from "../../services/api";
import type { MediaStatus } from "../../types/media";
import { mediaTypeLabels, mediaTypeMarks } from "./mediaConstants";

type MediaCardProps = {
  item: ApiMediaItem;
  index: number;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onRemove: (id: string) => void;
};

export function MediaCard({
  item,
  index,
  onStatusChange,
  onRemove,
}: MediaCardProps) {
  return (
    <article
      className={`media-card tone-${item.type}`}
      style={{ "--delay": `${index * 45}ms` } as CSSProperties}
    >
      <div className="card-visual" aria-hidden="true">
        <span className="media-mark">{mediaTypeMarks[item.type]}</span>
        <span className="media-initial">
          {item.title.charAt(0).toUpperCase()}
        </span>
        <span className="visual-type">{mediaTypeLabels[item.type]}</span>
      </div>
      <div className="card-content">
        <div className="card-meta">
          <span>{mediaTypeLabels[item.type]}</span>
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
                onStatusChange(item._id, event.target.value as MediaStatus)
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
