import type { QueueItemStatus, QueueItemType } from "../../types/queue";

export const queueItemTypeLabels: Record<QueueItemType, string> = {
  game: "Game",
  movie: "Movie",
  tv: "TV Show",
};

export const queueItemTypeMarks: Record<QueueItemType, string> = {
  game: "✦",
  movie: "●",
  tv: "▰",
};

export const queueItemStatusLabels: Record<QueueItemStatus, string> = {
  backlog: "Backlog",
  "in progress": "In progress",
  completed: "Completed",
};
