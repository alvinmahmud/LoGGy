import { Router } from "express";
import { searchCatalogController } from "../controllers/catalogController";
import { requireAuth } from "../middleware/auth";
import { catalogRateLimit } from "../middleware/authRateLimit";

const router = Router();

router.use(requireAuth);
router.get("/search", catalogRateLimit, searchCatalogController);

export default router;
