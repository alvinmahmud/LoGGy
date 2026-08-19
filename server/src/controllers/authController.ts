import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User";
import { hashPassword, verifyPassword } from "../services/passwordService";
import {
  AuthenticatedRequest,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../middleware/auth";

const googleClient = new OAuth2Client();
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dummyPasswordHash = hashPassword("not-a-real-password");

type PublicUserShape = {
  _id: unknown;
  email: string;
  username: string;
  picture?: string | null;
};

function publicUser(user: PublicUserShape) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    picture: user.picture || undefined,
  };
}

function setSession(res: Response, userId: string) {
  res.cookie(
    SESSION_COOKIE,
    createSessionToken(userId),
    sessionCookieOptions(),
  );
}

function validPassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    password.length <= 128
  );
}

export async function checkAvailability(req: Request, res: Response) {
  const username =
    typeof req.query.username === "string" ? req.query.username.trim() : "";
  const email =
    typeof req.query.email === "string"
      ? req.query.email.trim().toLowerCase()
      : "";

  if (!username && !email) {
    res.status(400).json({ message: "Provide a username or email to check" });

    return;
  }

  const [usernameUsed, emailUsed] = await Promise.all([
    username && usernamePattern.test(username)
      ? User.exists({ usernameKey: username.toLowerCase() })
      : Promise.resolve(null),
    email && emailPattern.test(email)
      ? User.exists({ email })
      : Promise.resolve(null),
  ]);

  res.json({
    usernameAvailable: username
      ? usernamePattern.test(username) && !usernameUsed
      : null,
    emailAvailable: email ? emailPattern.test(email) && !emailUsed : null,
  });
}

export async function register(req: Request, res: Response) {
  const username =
    typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const usernameKey = username.toLowerCase();
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body?.password;

  if (!usernamePattern.test(username)) {
    res.status(400).json({
      message:
        "Username must be 3–24 characters using letters, numbers, or underscores",
    });
    return;
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    res.status(400).json({ message: "Enter a valid email address" });
    return;
  }
  if (!validPassword(password)) {
    res
      .status(400)
      .json({ message: "Password must be between 10 and 128 characters" });
    return;
  }

  try {
    const existing = await User.findOne({
      $or: [{ email }, { usernameKey }],
    }).select("email usernameKey");

    if (existing) {
      res.status(409).json({
        message:
          existing.email === email
            ? "An account with that email already exists"
            : "That username is already taken",
      });

      return;
    }

    const user = await User.create({
      authProvider: "password",
      username,
      usernameKey,
      email,
      passwordHash: await hashPassword(password),
    });
    setSession(res, user.id);

    res.status(201).json({ user: publicUser(user) });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      res
        .status(409)
        .json({ message: "That email or username is already in use" });
      return;
    }

    res.status(500).json({ message: "Account could not be created" });
  }
}

export async function passwordLogin(req: Request, res: Response) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body?.password;

  if (!emailPattern.test(email) || typeof password !== "string") {
    res.status(401).json({ message: "Email or password is incorrect" });

    return;
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  const storedHash = user?.passwordHash || (await dummyPasswordHash);
  const passwordMatches = await verifyPassword(password, storedHash);

  if (!user || !passwordMatches || user.authProvider !== "password") {
    res.status(401).json({ message: "Email or password is incorrect" });

    return;
  }

  setSession(res, user.id);

  res.json({ user: publicUser(user) });
}

async function availableGoogleUsername(name: string, email: string) {
  const raw = (name || email.split("@")[0]).replace(/[^A-Za-z0-9_]/g, "");
  const base = (raw || "reader").slice(0, 18).padEnd(3, "_");
  let candidate = base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await User.exists({ usernameKey: candidate.toLowerCase() })))
      return candidate;
    candidate = `${base.slice(0, 18)}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return `reader_${Date.now().toString(36)}`;
}

export async function googleLogin(req: Request, res: Response) {
  const credential = req.body?.credential;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res
      .status(503)
      .json({ message: "Google authentication is not configured" });

    return;
  }
  if (typeof credential !== "string" || !credential) {
    res.status(400).json({ message: "A Google credential is required" });

    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      res.status(401).json({ message: "Google account profile is incomplete" });

      return;
    }

    let user = await User.findOne({ googleSub: payload.sub });
    if (!user) {
      if (await User.exists({ email: payload.email.toLowerCase() })) {
        res.status(409).json({
          message:
            "An account with this email already exists. Sign in with your password.",
        });

        return;
      }

      const username = await availableGoogleUsername(
        payload.name || "",
        payload.email,
      );

      user = await User.create({
        authProvider: "google",
        googleSub: payload.sub,
        username,
        usernameKey: username.toLowerCase(),
        email: payload.email.toLowerCase(),
        picture: payload.picture,
      });
    } else {
      user.picture = payload.picture;
      await user.save();
    }

    setSession(res, user.id);

    res.json({ user: publicUser(user) });
  } catch {
    res
      .status(401)
      .json({ message: "Google credential could not be verified" });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  const { userId } = (req as AuthenticatedRequest).auth;
  const user = await User.findById(userId);
  if (!user) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    res.status(401).json({ message: "User no longer exists" });
    return;
  }
  res.json({ user: publicUser(user) });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).send();
}
