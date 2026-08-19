import { NextFunction, Request, Response } from "express";

type AttemptWindow = { count: number; resetsAt: number };
const WINDOW_MS = 15 * 60 * 1000;

function createRateLimit(maxAttempts: number) {
  const attempts = new Map<string, AttemptWindow>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = attempts.get(key);
    const window =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + WINDOW_MS }
        : current;

    window.count += 1;
    attempts.set(key, window);

    res.setHeader("RateLimit-Limit", maxAttempts);
    res.setHeader(
      "RateLimit-Remaining",
      Math.max(0, maxAttempts - window.count),
    );
    res.setHeader("RateLimit-Reset", Math.ceil(window.resetsAt / 1000));

    if (window.count > maxAttempts) {
      res.status(429).json({ message: "Too many requests. Try again later." });

      return;
    }

    next();
  };
}

export const authRateLimit = createRateLimit(12);
export const availabilityRateLimit = createRateLimit(60);
export const catalogRateLimit = createRateLimit(300);
