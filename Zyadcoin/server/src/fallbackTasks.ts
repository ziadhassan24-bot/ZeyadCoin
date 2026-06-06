// One multiple-choice question. Used both as the response shape and by the
// fallback list below.
export interface QuizQuestion {
  question: string; // the question text
  options: string[]; // exactly 4 answer options
  correctIndex: number; // 0-based index of the correct option (0..3)
}

// Three EASY, language-neutral multiple-choice questions used whenever Groq is
// unavailable (missing key, network error, rate limit, or malformed response).
// Keeping them neutral means they work for any chosen language. The correct
// option is placed in a different position each time so it is not always "A".
export const FALLBACK_TASKS: QuizQuestion[] = [
  {
    question: "Which symbol assigns a value to a variable in most languages?",
    options: ["=", "==", "=>", "!="],
    correctIndex: 0,
  },
  {
    question: "What does a print / output statement do?",
    options: [
      "Creates a new file",
      "Shows text on the screen",
      "Adds two numbers",
      "Repeats code in a loop",
    ],
    correctIndex: 1,
  },
  {
    question: "Which of these values is a whole number (an integer)?",
    options: ["3.14", '"7"', "10", "true"],
    correctIndex: 2,
  },
];
