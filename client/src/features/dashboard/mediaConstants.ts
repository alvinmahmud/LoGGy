import type { MediaStatus, MediaType } from "../../types/media";

export const mediaTypeLabels: Record<MediaType, string> = {
  movie: "Film",
  tv: "Series",
  book: "Book",
  game: "Game",
};

export const mediaTypeMarks: Record<MediaType, string> = {
  movie: "●",
  tv: "▰",
  book: "▥",
  game: "✦",
};

export const mediaStatusLabels: Record<MediaStatus, string> = {
  backlog: "Backlog",
  "in progress": "In progress",
  completed: "Completed",
};
