import { CheckCircle2, Circle } from "lucide-react";
import type { TaskItem } from "../hooks/useTasks";

/**
 * One multiple-choice question: the question text and 4 clickable options.
 *
 * The browser does NOT know the correct answer (grading happens on the backend
 * after all 3 are submitted), so there is no correct/wrong feedback here. One
 * attempt only: the first click locks the question and highlights the pick.
 */
interface TaskCardProps {
  index: number;
  task: TaskItem;
  language?: string; // the language these questions are about, e.g. "Python"
  onSelect: (index: number, optionIndex: number) => void;
}

export default function TaskCard({ index, task, language, onSelect }: TaskCardProps) {
  const answered = task.selectedIndex !== null;

  return (
    <div
      className={`brutal-border flex flex-col rounded-2xl p-6 shadow-brutal transition-colors ${
        answered ? "bg-blue" : "bg-cream"
      }`}
    >
      {/* Header: number (+ language) on the left, answered status on the right */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="brutal-border bg-yellow flex h-10 w-10 items-center justify-center rounded-lg font-display text-lg font-bold">
            {index + 1}
          </div>
          {language && (
            <span className="brutal-border bg-cream rounded-md px-2 py-0.5 text-xs font-bold">
              {language}
            </span>
          )}
        </div>
        {answered ? (
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
            Answered
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500">
            <Circle className="h-5 w-5" strokeWidth={2} />
            Pick one
          </span>
        )}
      </div>

      {/* The question */}
      <p className="mb-4 font-semibold leading-snug">{task.question}</p>

      {/* The 4 options. After the first pick, all options lock. */}
      <div className="flex flex-col gap-2">
        {task.options.map((option, i) => {
          const isPicked = task.selectedIndex === i;
          const stateClass = isPicked
            ? "bg-ink text-white" // the chosen option
            : answered
              ? "bg-white opacity-60" // locked, not chosen
              : "bg-white brutal-hover";

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(index, i)}
              disabled={answered}
              className={`brutal-border flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-semibold shadow-brutal-sm transition-all disabled:cursor-default ${stateClass}`}
            >
              {/* A / B / C / D label */}
              <span
                className={`brutal-border flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                  isPicked ? "bg-white text-ink" : "bg-cream"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
