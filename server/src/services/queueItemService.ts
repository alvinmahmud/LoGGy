import QueueItem from "../models/QueueItem";

export const createQueueItem = (
  userId: string,
  data: Record<string, unknown>,
) => QueueItem.create({ ...data, user: userId });

export const getAllQueueItems = (userId: string) =>
  QueueItem.find({
    user: userId,
    type: { $in: ["game", "movie", "tv"] },
  }).sort({ createdAt: -1 });

export const getQueueItemById = (userId: string, id: string) =>
  QueueItem.findOne({ _id: id, user: userId });

export const updateQueueItem = (
  userId: string,
  id: string,
  data: Record<string, unknown>,
) => QueueItem.findOneAndUpdate({ _id: id, user: userId }, data, { new: true });

export const deleteQueueItem = (userId: string, id: string) =>
  QueueItem.findOneAndDelete({ _id: id, user: userId });
