import { Request, Response } from "express";
import {
  createMediaItem,
  deleteMediaItem,
  getAllMediaItems,
  getMediaItemById,
  updateMediaItem,
} from "../services/mediaItemService";
import { AuthenticatedRequest } from "../middleware/auth";

const mediaTypes = new Set(["game", "movie", "tv"]);
const statuses = new Set(["backlog", "in progress", "completed"]);

function userId(req: Request) {
  return (req as AuthenticatedRequest).auth.userId;
}

function mediaInput(body: unknown, partial = false) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (!partial || value.title !== undefined) {
    if (typeof value.title !== "string" || !value.title.trim()) return null;
    result.title = value.title.trim();
  }
  if (!partial || value.type !== undefined) {
    if (typeof value.type !== "string" || !mediaTypes.has(value.type))
      return null;
    result.type = value.type;
  }
  if (value.status !== undefined) {
    if (typeof value.status !== "string" || !statuses.has(value.status))
      return null;
    result.status = value.status;
  }
  if (value.notes !== undefined) {
    if (typeof value.notes !== "string") return null;
    result.notes = value.notes.trim();
  }
  if (value.year !== undefined) {
    if (
      typeof value.year !== "string" ||
      (value.year && !/^\d{4}$/.test(value.year))
    )
      return null;
    result.year = value.year;
  }
  return result;
}

export async function createMediaItemController(req: Request, res: Response) {
  try {
    const input = mediaInput(req.body);
    if (!input) {
      res
        .status(400)
        .json({ message: "A valid title and media type are required" });
      return;
    }
    res.status(201).json(await createMediaItem(userId(req), input));
  } catch {
    res.status(500).json({ message: "Could not create media item" });
  }
}

export async function getAllMediaItemsController(req: Request, res: Response) {
  try {
    res.json(await getAllMediaItems(userId(req)));
  } catch {
    res.status(500).json({ message: "Could not fetch media items" });
  }
}

export async function getMediaItemByIdController(req: Request, res: Response) {
  try {
    const item = await getMediaItemById(userId(req), req.params.id);
    if (!item) {
      res.status(404).json({ message: "Media item not found" });
      return;
    }
    res.json(item);
  } catch {
    res.status(400).json({ message: "Invalid media item ID" });
  }
}

export async function updateMediaItemController(req: Request, res: Response) {
  try {
    const input = mediaInput(req.body, true);
    if (!input || Object.keys(input).length === 0) {
      res.status(400).json({ message: "No valid media fields were supplied" });
      return;
    }
    const item = await updateMediaItem(userId(req), req.params.id, input);
    if (!item) {
      res.status(404).json({ message: "Media item not found" });
      return;
    }
    res.json(item);
  } catch {
    res.status(400).json({ message: "Invalid media item ID" });
  }
}

export async function deleteMediaItemController(req: Request, res: Response) {
  try {
    const item = await deleteMediaItem(userId(req), req.params.id);
    if (!item) {
      res.status(404).json({ message: "Media item not found" });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(400).json({ message: "Invalid media item ID" });
  }
}
