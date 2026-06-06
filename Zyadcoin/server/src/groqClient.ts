// ============================================================================
// Groq client: asks the Groq API to generate 3 EASY beginner multiple-choice
// questions in a chosen programming language. Each question has 4 options and
// exactly one correct answer.
//
// The Groq API key is read from process.env (loaded from server/.env). It lives
// only on this server — the browser never receives it. If anything goes wrong
// (no key, network error, rate limit, bad response), we fall back to a fixed
// set of language-neutral questions so the demo keeps working.
// ============================================================================

import Groq from "groq-sdk";
import { FALLBACK_TASKS, type QuizQuestion } from "./fallbackTasks.js";

// The model the assignment specifies. It is a current Groq production model
// that supports JSON mode.
const MODEL = "llama-3.3-70b-versatile";

// The only languages we allow. Anything else falls back to the default.
export const LANGUAGES = ["JavaScript", "Python", "Java", "C++"] as const;
const DEFAULT_LANGUAGE = "JavaScript";

// Validate the requested language. If missing or not in the allow-list, use the
// default (JavaScript) instead of erroring.
function normalizeLanguage(language: unknown): string {
  return LANGUAGES.includes(language as (typeof LANGUAGES)[number])
    ? (language as string)
    : DEFAULT_LANGUAGE;
}

// Type guard: is this parsed item a valid multiple-choice question?
//   - question: non-empty string
//   - options: array of exactly 4 non-empty strings
//   - correctIndex: integer 0..3
// Used to validate Groq's JSON before we trust it.
function isQuizQuestion(item: unknown): item is QuizQuestion {
  if (typeof item !== "object" || item === null) return false;
  const o = item as Record<string, unknown>;

  if (typeof o.question !== "string" || o.question.trim().length === 0) return false;

  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (!o.options.every((opt) => typeof opt === "string" && opt.trim().length > 0)) {
    return false;
  }

  // Reject duplicate options (Groq sometimes repeats one, e.g. "//" twice),
  // which makes a question confusing or unanswerable. Compare case-insensitively.
  const normalized = (o.options as string[]).map((opt) => opt.trim().toLowerCase());
  if (new Set(normalized).size !== 4) return false;

  if (
    typeof o.correctIndex !== "number" ||
    !Number.isInteger(o.correctIndex) ||
    o.correctIndex < 0 ||
    o.correctIndex > 3
  ) {
    return false;
  }

  return true;
}

const apiKey = process.env.GROQ_API_KEY;

// Only create the client if a key is configured; otherwise we go straight to
// the fallback without making a network call.
const client = apiKey ? new Groq({ apiKey }) : null;

export interface TasksResult {
  source: "groq" | "fallback";
  tasks: QuizQuestion[];
  language: string; // the resolved (validated) language used
}

export async function generateTasks(language: unknown): Promise<TasksResult> {
  // Resolve the language once; this is what we report back to the client.
  const lang = normalizeLanguage(language);

  // No key configured -> deterministic fallback, no network call.
  if (!client) {
    return { source: "fallback", tasks: FALLBACK_TASKS, language: lang };
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      // JSON mode: forces the model to return valid JSON. Note: Groq requires
      // the literal word "JSON" to appear in the prompt, which it does below.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate EASY beginner multiple-choice questions for someone learning to program. " +
            "Respond with ONLY valid JSON (no markdown, no code fences) of the exact form: " +
            '{ "tasks": [ { "question": "...", "options": ["...","...","...","..."], "correctIndex": 0 } ] }. ' +
            "Rules: exactly 3 items; each has a one-sentence question, an options array of EXACTLY 4 short strings, " +
            "and a correctIndex that is the 0-based index (0 to 3) of the single correct option. " +
            "Exactly one option is correct. No explanations and no extra keys.",
        },
        {
          role: "user",
          content:
            `Generate exactly 3 easy beginner multiple-choice questions about ${lang}. ` +
            `Each must have 4 options and exactly one correct answer. Respond with ONLY valid JSON.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";

    // Defensive parse: JSON.parse can throw, and the shape might be wrong even
    // in JSON mode, so we validate before trusting it.
    const parsed = JSON.parse(content) as { tasks?: unknown };
    const tasks = parsed.tasks;

    if (!Array.isArray(tasks) || tasks.length !== 3 || !tasks.every(isQuizQuestion)) {
      // Groq replied, but not in the shape we need -> safe fallback.
      return { source: "fallback", tasks: FALLBACK_TASKS, language: lang };
    }

    // Trim text fields before returning.
    const clean: QuizQuestion[] = (tasks as QuizQuestion[]).map((q) => ({
      question: q.question.trim(),
      options: q.options.map((opt) => opt.trim()),
      correctIndex: q.correctIndex,
    }));

    return { source: "groq", tasks: clean, language: lang };
  } catch (err) {
    // Covers Groq API errors (401 bad key, 429 rate limit, 5xx), network
    // failures, and JSON.parse throwing. The demo still gets 3 questions.
    console.error("Groq call failed, using fallback tasks:", err);
    return { source: "fallback", tasks: FALLBACK_TASKS, language: lang };
  }
}
