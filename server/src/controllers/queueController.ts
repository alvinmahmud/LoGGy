import { Request, Response } from "express";
import {
  createQueueItem,
  deleteQueueItem,
  getAllQueueItems,
  getQueueItemById,
  updateQueueItem,
} from "../services/queueItemService";
import { AuthenticatedRequest } from "../middleware/auth";

const queueItemTypes = new Set(["game", "movie", "tv"]);
const statuses = new Set(["backlog", "in progress", "completed"]);

function userId(req: Request) {
  return (req as AuthenticatedRequest).auth.userId;
}

function queueItemInput(body: unknown, partial = false) {
  if (!body || typeof body !== "object") {
    return null;
  }
  const value = body as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (!partial || value.title !== undefined) {
    if (typeof value.title !== "string" || !value.title.trim()) {
      return null;
    }
    result.title = value.title.trim();
  }
  if (!partial || value.type !== undefined) {
    if (typeof value.type !== "string" || !queueItemTypes.has(value.type)) {
      return null;
    }
    result.type = value.type;
  }
  if (value.status !== undefined) {
    if (typeof value.status !== "string" || !statuses.has(value.status)) {
      return null;
    }
    result.status = value.status;
  }
  if (value.notes !== undefined) {
    if (typeof value.notes !== "string") {
      return null;
    }
    result.notes = value.notes.trim();
  }
  if (value.year !== undefined) {
    if (
      typeof value.year !== "string" ||
      (value.year && !/^\d{4}$/.test(value.year))
    ) {
      return null;
    }
    result.year = value.year;
  }

  return result;
}

export async function createQueueItemController(req: Request, res: Response) {
  try {
    const input = queueItemInput(req.body);
    if (!input) {
      res
        .status(400)
        .json({ message: "A valid title and media type are required" });

      return;
    }
    res.status(201).json(await createQueueItem(userId(req), input));
  } catch {
    res.status(500).json({ message: "Could not create queue item" });
  }
}

export async function getAllQueueItemsController(req: Request, res: Response) {
  try {
    res.json(await getAllQueueItems(userId(req)));
  } catch {
    res.status(500).json({ message: "Could not fetch queue items" });
  }
}

export async function getQueueItemByIdController(req: Request, res: Response) {
  try {
    const item = await getQueueItemById(userId(req), req.params.id);
    if (!item) {
      res.status(404).json({ message: "Queue item not found" });

      return;
    }
    res.json(item);
  } catch {
    res.status(400).json({ message: "Invalid queue item ID" });
  }
}

export async function updateQueueItemController(req: Request, res: Response) {
  try {
    const input = queueItemInput(req.body, true);
    if (!input || Object.keys(input).length === 0) {
      res.status(400).json({ message: "No valid queue fields were supplied" });

      return;
    }
    const item = await updateQueueItem(userId(req), req.params.id, input);
    if (!item) {
      res.status(404).json({ message: "Queue item not found" });

      return;
    }
    res.json(item);
  } catch {
    res.status(400).json({ message: "Invalid queue item ID" });
  }
}

export async function deleteQueueItemController(req: Request, res: Response) {
  try {
    const item = await deleteQueueItem(userId(req), req.params.id);
    if (!item) {
      res.status(404).json({ message: "Queue item not found" });

      return;
    }
    res.status(204).send();
  } catch {
    res.status(400).json({ message: "Invalid queue item ID" });
  }
}
