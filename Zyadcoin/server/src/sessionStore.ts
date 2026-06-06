// ============================================================================
// Quiz session store (in-memory).
//
// When the frontend asks for questions we keep the FULL questions — including
// the correct answer index — here on the server, keyed by a random sessionId.
// The browser only ever receives the questions and options, never the answers.
// Grading then happens server-side in /api/claim against this store.
//
// In-memory is fine for a single-instance class demo. Sessions are lost on
// restart and are not shared across multiple server instances.
// ============================================================================

import { randomUUID } from "node:crypto";
import type { QuizQuestion } from "./fallbackTasks.js";

interface StoredSession {
  questions: QuizQuestion[]; // full questions INCLUDING correctIndex (server-only)
  expiresAt: number; // ms since epoch
}

const SESSION_TTL_MS = 15 * 60 * 1000; // sessions expire after 15 minutes
const sessions = new Map<string, StoredSession>();

// Store a set of questions and return a fresh random session id.
export function createSession(questions: QuizQuestion[]): string {
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    questions,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
}

// Look up a session. Returns null if it does not exist or has expired
// (expired sessions are removed on access).
export function getSession(sessionId: string): StoredSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

// Remove a session (called after it has been graded so it cannot be reused).
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Periodically evict expired sessions so the Map does not grow unbounded.
// unref() so this timer never keeps the process alive on its own.
const sweep = setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now > session.expiresAt) sessions.delete(id);
    }
  },
  5 * 60 * 1000,
);
sweep.unref();
