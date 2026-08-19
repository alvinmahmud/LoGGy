import type { ApiMediaItem } from "../services/api";

export type MediaType = ApiMediaItem["type"];
export type MediaStatus = ApiMediaItem["status"];
export type NewMediaItem = Omit<ApiMediaItem, "_id" | "createdAt">;
