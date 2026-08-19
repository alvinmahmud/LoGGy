import { Router } from "express";
import {
  createQueueItemController,
  getAllQueueItemsController,
  getQueueItemByIdController,
  updateQueueItemController,
  deleteQueueItemController,
} from "../controllers/queueController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getAllQueueItemsController);
router.get("/:id", getQueueItemByIdController);
router.post("/", createQueueItemController);
router.put("/:id", updateQueueItemController);
router.delete("/:id", deleteQueueItemController);

export default router;
