// Zeyad Coin demo — backend entry point.
//
// This Express server has ONE job for the demo: expose an endpoint that asks
// Groq to generate 3 beginner coding tasks. The Groq API key is loaded from
// the .env file into process.env and stays on this server — the browser never
// receives it. (The Groq route itself is added in milestone M2.)

import "dotenv/config"; // loads server/.env into process.env before anything else
import express from "express";
import cors from "cors";
import { tasksRouter } from "./routes/tasks.js";
import { claimRouter } from "./routes/claim.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Trust the first proxy (Render, Vercel, etc.) so rate limiters and logging
// see the real client IP from X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

// CORS allowlist. Always allow the local Vite dev origins. In production, add
// the deployed frontend origin(s) via the FRONTEND_URL env var (comma-separated
// if there is more than one, e.g. a Vercel production URL). Without this, the
// browser would block every request from the deployed site.
const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const prodOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...devOrigins, ...prodOrigins];

app.use(cors({ origin: allowedOrigins }));

// Parse JSON request bodies.
app.use(express.json());

// Simple health check used to confirm the server is up (milestone M0).
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// POST /api/tasks  -> 3 quiz questions (answers hidden) + a sessionId.
app.use("/api", tasksRouter);
// POST /api/claim  -> grade answers; on all-correct, return a signed claim.
app.use("/api", claimRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
