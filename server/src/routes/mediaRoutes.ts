import { Router } from "express";
import {
  createMediaItemController,
  getAllMediaItemsController,
  getMediaItemByIdController,
  updateMediaItemController,
  deleteMediaItemController,
} from "../controllers/mediaController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getAllMediaItemsController);
router.get("/:id", getMediaItemByIdController);
router.post("/", createMediaItemController);
router.put("/:id", updateMediaItemController);
router.delete("/:id", deleteMediaItemController);

export default router;
