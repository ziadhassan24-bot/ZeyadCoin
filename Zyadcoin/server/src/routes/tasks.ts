import { Router } from "express";
import rateLimit from "express-rate-limit";
import { generateTasks } from "../groqClient.js";
import { createSession } from "../sessionStore.js";

export const tasksRouter = Router();

// Rate limiter for /api/tasks: 20 requests per 10 minutes per IP.
// Enough for honest retries if Groq is slow, but stops a script from hammering
// the Groq API and burning through the free quota.
const tasksLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 requests per window per IP
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many task requests from this IP. Please try again in 10 minutes.",
  },
});

// POST /api/tasks
// Body: { language?: string }  (one of JavaScript, Python, Java, C++)
// Returns { source, language, sessionId, tasks: [{ question, options }] x3 }.
//
// The full questions (WITH the correct answer index) are stored server-side and
// keyed by sessionId. The browser receives ONLY the questions and options — it
// never sees correctIndex, so it cannot grade itself. Grading happens in
// /api/claim using the sessionId. Always responds 200 so the demo never breaks.
tasksRouter.post("/tasks", tasksLimiter, async (req, res) => {
  const result = await generateTasks(req.body?.language);

  // Keep the answers on the server; hand the browser a session id instead.
  const sessionId = createSession(result.tasks);

  // Strip correctIndex from what we send to the browser.
  const publicTasks = result.tasks.map((q) => ({
    question: q.question,
    options: q.options,
  }));

  res.json({
    source: result.source,
    language: result.language,
    sessionId,
    tasks: publicTasks,
  });
});
