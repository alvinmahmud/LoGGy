import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
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

mediaItemSchema.index({ user: 1, createdAt: -1 });

const MediaItem = mongoose.model("MediaItem", mediaItemSchema);

export default MediaItem;
