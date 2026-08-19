import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const SESSION_COOKIE = "media_backlog_session";

export interface AuthenticatedRequest extends Request {
  auth: { userId: string };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") {
    return "media-backlog-local-development-secret-change-before-production";
  }
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export function createSessionToken(userId: string) {
  return jwt.sign({}, getJwtSecret(), {
    subject: userId,
    expiresIn: "7d",
    issuer: "media-backlog",
    audience: "media-backlog-web",
  });
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "media-backlog",
      audience: "media-backlog-web",
    }) as JwtPayload;

    if (!payload.sub) throw new Error("Session subject is missing");
    (req as AuthenticatedRequest).auth = { userId: payload.sub };
    next();
  } catch {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    res.status(401).json({ message: "Session is invalid or expired" });
  }
}
