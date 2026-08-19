import type { MediaStatus, MediaType } from "../../types/media";

export const mediaTypeLabels: Record<MediaType, string> = {
  game: "Game",
  movie: "Movie",
  tv: "TV Show",
};

export const mediaTypeMarks: Record<MediaType, string> = {
  game: "✦",
  movie: "●",
  tv: "▰",
};

export const mediaStatusLabels: Record<MediaStatus, string> = {
  backlog: "Backlog",
  "in progress": "In progress",
  completed: "Completed",
};
