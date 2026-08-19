import type { QueueItem } from "../services/api";

export type QueueItemType = QueueItem["type"];
export type QueueItemStatus = QueueItem["status"];
export type NewQueueItem = Omit<QueueItem, "_id" | "createdAt">;
