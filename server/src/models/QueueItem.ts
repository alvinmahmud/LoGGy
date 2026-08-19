import mongoose from "mongoose";

const queueItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["game", "movie", "tv"],
      required: true,
    },
    status: {
      type: String,
      enum: ["backlog", "in progress", "completed"],
      default: "backlog",
    },
    notes: { type: String },
    year: { type: String, match: /^\d{4}$/ },
  },
  { timestamps: true },
);

queueItemSchema.index({ user: 1, createdAt: -1 });

// Keep the existing collection name so the project rename preserves user data.
const QueueItem = mongoose.model("QueueItem", queueItemSchema, "mediaitems");

export default QueueItem;
