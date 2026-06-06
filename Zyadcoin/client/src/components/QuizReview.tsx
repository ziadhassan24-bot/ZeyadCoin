import { Check, X } from "lucide-react";
import type { ReviewItem } from "../lib/api";

/**
 * Shown after a wrong submission. The session is already consumed server-side,
 * so it is safe to reveal the answer key here. For each question we mark the
 * correct option (green) and, when the user missed it, their wrong pick (red),
 * so they can see exactly what went wrong instead of a mysterious "not correct".
 */
interface QuizReviewProps {
  review: ReviewItem[];
}

export default function QuizReview({ review }: QuizReviewProps) {
  const correctCount = review.filter((r) => r.yourIndex === r.correctIndex).length;

  return (
    <div className="mt-5">
      <div className="mb-4 brutal-border bg-ink inline-block rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Answer key — you got {correctCount} / {review.length} right
      </div>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {review.map((item, qi) => {
          const gotItRight = item.yourIndex === item.correctIndex;
          return (
            <div
              key={qi}
              className="brutal-border rounded-xl bg-cream p-4 shadow-brutal-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="brutal-border bg-yellow flex h-7 w-7 items-center justify-center rounded-md font-display text-sm font-bold">
                  {qi + 1}
                </span>
                {gotItRight ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                    <X className="h-4 w-4" strokeWidth={3} />
                    Missed
                  </span>
                )}
              </div>

              <p className="mb-3 text-sm font-semibold leading-snug">
                {item.question}
              </p>

              <div className="flex flex-col gap-1.5">
                {item.options.map((option, oi) => {
                  const isCorrect = oi === item.correctIndex;
                  const isYourWrongPick =
                    oi === item.yourIndex && item.yourIndex !== item.correctIndex;

                  // Correct answer = green. The user's wrong pick = red. Every
                  // other option stays muted. Only ONE small pill per row, never
                  // struck through, so it always stays readable.
                  const rowClass = isCorrect
                    ? "bg-green border-black"
                    : isYourWrongPick
                      ? "bg-red-100 border-red-400 text-red-900"
                      : "bg-white border-black/15 text-zinc-500";

                  return (
                    <div
                      key={oi}
                      className={`flex items-center gap-2 rounded-md border-2 px-2.5 py-1.5 text-xs font-semibold ${rowClass}`}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                      {/* Only the wrong pick's text is struck — the labels stay clean. */}
                      <span className={`flex-1 ${isYourWrongPick ? "line-through decoration-red-500/70" : ""}`}>
                        {option}
                      </span>
                      {isCorrect && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          Answer
                        </span>
                      )}
                      {isYourWrongPick && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          <X className="h-3 w-3" strokeWidth={3} />
                          Your pick
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
