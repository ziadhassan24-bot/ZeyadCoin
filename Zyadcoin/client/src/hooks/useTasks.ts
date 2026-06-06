// ============================================================================
// useTasks: owns the 3 multiple-choice questions and the user's picks.
//
// The browser no longer knows the correct answers (the backend hides them and
// grades server-side). So this hook does NO grading: it just fetches the
// questions + a sessionId, and records which option the user picked per
// question (one attempt each — the first pick locks the question). The
// sessionId + the picked answers are later sent to /api/claim for grading.
// ============================================================================

import { useCallback, useState } from "react";
import { fetchTasks as apiFetchTasks } from "../lib/api";

export interface TaskItem {
  question: string;
  options: string[]; // the 4 answer options
  selectedIndex: number | null; // the picked option; null = unanswered. Locks once set.
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"groq" | "fallback" | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const allAnswered =
    tasks.length === 3 && tasks.every((t) => t.selectedIndex !== null);

  // Fetch a fresh set of questions (and a new sessionId) in the chosen language.
  const fetchTasks = useCallback(async (lang: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchTasks(lang);
      setSource(data.source);
      setLanguage(data.language);
      setSessionId(data.sessionId);
      setTasks(
        data.tasks.map((q) => ({
          question: q.question,
          options: q.options,
          selectedIndex: null,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions.");
      setTasks([]);
      setSessionId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Record the user's pick for one question. One attempt only: the first pick
  // locks the question (later clicks are ignored). No correctness check here.
  const selectOption = useCallback((index: number, optionIndex: number) => {
    setTasks((prev) => {
      const current = prev[index];
      if (!current || current.selectedIndex !== null) return prev;
      return prev.map((t, i) =>
        i === index ? { ...t, selectedIndex: optionIndex } : t,
      );
    });
  }, []);

  return {
    tasks,
    sessionId,
    loading,
    error,
    source,
    language,
    allAnswered,
    fetchTasks,
    selectOption,
  };
}
