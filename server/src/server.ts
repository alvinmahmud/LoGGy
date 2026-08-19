import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import catalogRoutes from "./routes/catalogRoutes";
import queueRoutes from "./routes/queueRoutes";

dotenv.config();

const app: Express = express();
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/queue", queueRoutes);

const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/loggy";
const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await mongoose.connect(uri);
    app.listen(port, () =>
      console.log(`LoGGy API listening on port ${port}`),
    );
  } catch (error) {
    console.error("Could not start LoGGy API", error);
    process.exit(1);
  }
}

void start();
