import { Router } from "express";
import {
  checkAvailability,
  getCurrentUser,
  googleLogin,
  logout,
  passwordLogin,
  register,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import {
  authRateLimit,
  availabilityRateLimit,
} from "../middleware/authRateLimit";

const router = Router();

router.get("/availability", availabilityRateLimit, checkAvailability);
router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, passwordLogin);
router.post("/google", authRateLimit, googleLogin);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", logout);

export default router;
