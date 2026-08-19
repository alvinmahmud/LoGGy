import MediaItem from "../models/MediaItem";

export const createMediaItem = (
  userId: string,
  data: Record<string, unknown>,
) => MediaItem.create({ ...data, user: userId });

export const getAllMediaItems = (userId: string) =>
  MediaItem.find({ user: userId }).sort({ createdAt: -1 });

export const getMediaItemById = (userId: string, id: string) =>
  MediaItem.findOne({ _id: id, user: userId });

export const updateMediaItem = (
  userId: string,
  id: string,
  data: Record<string, unknown>,
) => MediaItem.findOneAndUpdate({ _id: id, user: userId }, data, { new: true });

export const deleteMediaItem = (userId: string, id: string) =>
  MediaItem.findOneAndDelete({ _id: id, user: userId });
