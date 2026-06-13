// ============================================================================
// Frontend API client. The only backend call in the app: fetch 3 coding tasks.
//
// - Local dev: VITE_API_URL is unset, so the base is "" and we call the
//   relative path /api/tasks. The Vite dev server proxies that to the Express
//   backend on :3001 (see vite.config.ts).
// - Production: VITE_API_URL is set (e.g. https://zyadcoin-backend.onrender.com)
//   at build time, so we call the backend's full URL directly (no proxy).
// ============================================================================

// Trailing slash is stripped so `${API_BASE}/api/tasks` never doubles up.
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

// One multiple-choice question (matches the backend response shape).
// The correct answer is NO LONGER sent — grading happens on the backend.
export interface QuizQuestion {
  question: string;
  options: string[]; // exactly 4
}

export interface TasksResponse {
  source: "groq" | "fallback";
  language: string; // the resolved language the backend used
  sessionId: string; // identifies this set of questions for grading in /api/claim
  tasks: QuizQuestion[];
}

// One graded question, returned after grading so the UI can show the answer key.
export interface ReviewItem {
  question: string;
  options: string[]; // the 4 options, as graded on the server
  correctIndex: number; // the right answer
  yourIndex: number; // what the user picked
}

// Response from POST /api/claim. On all-correct it carries a signed claim; on a
// wrong/expired session it carries success:false, a message, and (when the
// answers were graded) a per-question review so the user can see what they
// missed. A missing/expired session has no review.
export interface ClaimResponse {
  success: boolean;
  message?: string;
  review?: ReviewItem[];
  amount?: string; // base units (string — JSON has no BigInt)
  nonce?: string;
  deadline?: string; // unix seconds
  signature?: string;
  partialCredit?: boolean; // true if user got partial credit (1-2 correct)
  correctCount?: number; // how many they got right
  txHash?: string; // hash if gasless transfer was used
}

export async function fetchTasks(language: string): Promise<TasksResponse> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Send the chosen language; the backend validates and defaults if needed.
    body: JSON.stringify({ language }),
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  const data = (await res.json()) as TasksResponse;

  // Basic shape guard so the UI can trust what it renders: a sessionId and
  // exactly 3 questions, each with a question string and 4 options.
  const ok =
    typeof data.sessionId === "string" &&
    Array.isArray(data.tasks) &&
    data.tasks.length === 3 &&
    data.tasks.every(
      (q) =>
        typeof q?.question === "string" &&
        Array.isArray(q?.options) &&
        q.options.length === 4,
    );
  if (!ok) {
    throw new Error("Unexpected response: expected a sessionId and 3 questions.");
  }

  return data;
}

// POST /api/claim — submit the chosen answers for grading. The backend grades
// server-side and, only if all 3 are correct, returns a signed claim.
export async function claimReward(body: {
  sessionId: string;
  answers: number[];
  userAddress: string;
}): Promise<ClaimResponse> {
  const res = await fetch(`${API_BASE}/api/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // The backend returns a JSON body for every outcome (success, wrong answers,
  // expired session, or error), so we parse and let the caller read .success.
  return (await res.json()) as ClaimResponse;
}

// POST /api/claim/gasless — request a gasless transfer (backend sends ZYD directly)
export async function claimGasless(userAddress: string): Promise<{
  success: boolean;
  txHash?: string;
  amount?: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/api/claim/gasless`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAddress }),
  });
  return await res.json();
}
