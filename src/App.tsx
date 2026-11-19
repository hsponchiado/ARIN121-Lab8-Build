import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Copy,
  Check,
  FileText,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface QuizOption {
  key: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
}

interface QuizData {
  quizTitle: string;
  questions: QuizQuestion[];
}

const SAMPLE_NOTES = [
  {
    topic: 'Biology: Cellular Respiration',
    text: `Cellular respiration is a metabolic pathway that breaks down glucose and produces ATP. The stages of cellular respiration include glycolysis, pyruvate oxidation, the citric acid (Krebs) cycle, and oxidative phosphorylation.

1. Glycolysis occurs in the cytoplasm and does not require oxygen (anaerobic). It breaks 1 glucose molecule into 2 pyruvate molecules, yielding a net 2 ATP and 2 NADH.
2. Pyruvate oxidation moves pyruvate into the mitochondrial matrix, converting each pyruvate into acetyl-CoA, releasing CO2 and producing NADH.
3. The Citric Acid Cycle occurs in the mitochondrial matrix. Acetyl-CoA combines with oxaloacetate to form citrate. It completes the breakdown of glucose, generating ATP, NADH, and FADH2.
4. Oxidative phosphorylation takes place on the inner mitochondrial membrane. The electron transport chain (ETC) creates a proton gradient across the membrane, driving ATP synthase to produce the majority of ATP (~28-32 total ATP per glucose). Oxygen acts as the final electron acceptor, forming water.`,
  },
  {
    topic: 'Computer Science: Algorithms & Big-O',
    text: `Algorithm complexity measures time and space resource usage relative to input size (n).
- O(1) Constant Time: Operation executes in fixed time regardless of input size (e.g., array index lookup, hash map get/put average case).
- O(log n) Logarithmic Time: Input size is halved at each step (e.g., binary search on sorted array).
- O(n) Linear Time: Execution time scales directly with input size (e.g., iterating through an unsorted array to find minimum).
- O(n log n) Linearithmic Time: Standard for optimal comparison-based sorting algorithms like Merge Sort and Heap Sort. QuickSort averages O(n log n) but has O(n^2) worst case.
- O(n^2) Quadratic Time: Involves nested iterations over the dataset (e.g., Bubble Sort, Selection Sort).
Space complexity tracks extra memory allocated during execution. Merge Sort requires O(n) auxiliary memory, whereas In-Place QuickSort uses O(log n) stack space.`,
  },
  {
    topic: 'Economics: Supply & Elasticity',
    text: `Price Elasticity of Demand (PED) measures how sensitive the quantity demanded of a good is to a change in its price.
Formula: PED = (% Change in Quantity Demanded) / (% Change in Price).
- Inelastic Demand (|PED| < 1): Quantity demanded changes proportionally less than the price change. Necessities (e.g., insulin, basic food) and goods with few substitutes tend to be price inelastic. When price rises, total revenue increases.
- Elastic Demand (|PED| > 1): Quantity demanded changes proportionally more than the price change. Luxury items or goods with many close substitutes (e.g., brand soda) tend to be elastic. When price rises, total revenue decreases.
- Unit Elastic (|PED| = 1): Percentage changes are identical; total revenue remains unchanged when price fluctuates.
Cross-Price Elasticity of Demand measures the responsiveness between two different goods. A positive cross-price elasticity indicates substitute goods, while a negative value indicates complementary goods.`,
  },
];

export default function App() {
  const [studyNotes, setStudyNotes] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if notes box is empty
    if (!studyNotes || studyNotes.trim().length === 0) {
      setValidationError('Please enter your study notes to generate a quiz.');
      setErrorMessage(null);
      // Scroll to textarea if needed
      const textarea = document.getElementById('study-notes-input');
      if (textarea) textarea.focus();
      return;
    }

    setValidationError(null);
    setErrorMessage(null);
    setIsLoading(true);

    // Clamp count
    const safeCount = Math.max(1, Math.min(5, questionCount || 3));

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: studyNotes,
          questionCount: safeCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz. Please try again.');
      }

      setQuizData(data);
      setUserAnswers({}); // Reset user answers for the new quiz
      setCopied(false);

      // Smooth scroll to questions
      setTimeout(() => {
        const quizSection = document.getElementById('quiz-results-section');
        if (quizSection) {
          quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while generating the quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleClearSelections = () => {
    setUserAnswers({});
  };

  const handleCopyQuiz = () => {
    if (!quizData) return;

    let textContent = `${quizData.quizTitle}\n${'='.repeat(quizData.quizTitle.length)}\n\n`;

    textContent += `--- PRACTICE QUESTIONS ---\n\n`;
    quizData.questions.forEach((q, i) => {
      textContent += `Question ${i + 1}: ${q.question}\n`;
      q.options.forEach((opt) => {
        textContent += `  ${opt.key}) ${opt.text}\n`;
      });
      textContent += `\n`;
    });

    textContent += `--- ANSWER KEY & EXPLANATIONS ---\n\n`;
    quizData.questions.forEach((q, i) => {
      const correctOpt = q.options.find((o) => o.key === q.correctAnswer);
      textContent += `Question ${i + 1} Answer: [${q.correctAnswer}] ${correctOpt ? correctOpt.text : ''}\n`;
      textContent += `Explanation: ${q.explanation}\n\n`;
    });

    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Calculate score if answers are selected
  const totalQuestions = quizData?.questions.length || 0;
  const answeredCount = Object.keys(userAnswers).length;
  const correctCount = quizData?.questions.reduce((acc, q) => {
    return acc + (userAnswers[q.id] === q.correctAnswer ? 1 : 0);
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">CampusQuiz</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
                Practice Quiz Generator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {quizData && (
              <button
                type="button"
                onClick={() => {
                  setQuizData(null);
                  setUserAnswers({});
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start New</span>
              </button>
            )}
            <a
              href="#instructions"
              className="hidden md:inline-flex text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              How It Works
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Intro Banner */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Instant Practice Quizzes
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Paste your university study notes, lecture summaries, or textbook sections. We’ll generate multiple-choice questions with 4 answer options each, along with full explanations.
            </p>
          </div>

          <form onSubmit={handleGenerateQuiz} className="mt-6 flex flex-col gap-6">
            {/* Study Notes Textarea */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="study-notes-input"
                  className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Study Notes
                </label>
                <div className="flex items-center gap-2">
                  {studyNotes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStudyNotes('')}
                      className="text-xs text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Clear Notes
                    </button>
                  )}
                  <span className="text-xs text-slate-500 tabular-nums">
                    {studyNotes.trim() ? studyNotes.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
              </div>

              {/* Sample Notes Quick-Load */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1">
                <span className="text-slate-500 font-medium">Try a sample note:</span>
                {SAMPLE_NOTES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStudyNotes(sample.text);
                      setValidationError(null);
                      setErrorMessage(null);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    {sample.topic.split(':')[0]}
                  </button>
                ))}
              </div>

              <textarea
                id="study-notes-input"
                rows={7}
                value={studyNotes}
                onChange={(e) => {
                  setStudyNotes(e.target.value);
                  if (validationError && e.target.value.trim().length > 0) {
                    setValidationError(null);
                  }
                }}
                placeholder="Paste your study notes here... (e.g. key terms, lecture takeaways, textbook chapter points, biology steps, historical dates, or formulas)"
                className={`w-full p-3.5 text-sm rounded-lg border font-mono sm:font-sans leading-relaxed focus:outline-none transition-colors ${
                  validationError
                    ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />

              {/* Validation alert if notes box is empty */}
              {validationError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm animate-fadeIn"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Question Count & Generate Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="question-count-input"
                  className="text-sm font-semibold text-slate-800 whitespace-nowrap"
                >
                  Number of Questions:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="question-count-input"
                    type="number"
                    min="1"
                    max="5"
                    value={questionCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setQuestionCount(1);
                      } else {
                        setQuestionCount(Math.max(1, Math.min(5, val)));
                      }
                    }}
                    className="w-16 px-2.5 py-1.5 text-center text-sm font-semibold text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 tabular-nums"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuestionCount(n)}
                        className={`w-7 h-7 text-xs font-semibold rounded-md border transition-colors ${
                          questionCount === n
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline">(1 to 5)</span>
              </div>

              {/* Generate Quiz Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to generate quiz</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}
        </section>

        {/* Quiz Results Section */}
        {quizData && (
          <section
            id="quiz-results-section"
            className="flex flex-col gap-8 animate-fadeIn"
          >
            {/* Quiz Header & Action Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Practice Quiz
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  {quizData.quizTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {quizData.questions.length} Question{quizData.questions.length > 1 ? 's' : ''} with 4 Options Each · Select an option to practice
                </p>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyQuiz}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Copy quiz questions and answer key to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Quiz</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Print or save as PDF"
                >
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Practice Questions
                </h3>
                {answeredCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelections}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Selections
                  </button>
                )}
              </div>

              {quizData.questions.map((q, idx) => {
                const selectedKey = userAnswers[q.id];

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4"
                  >
                    {/* Question Header */}
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        Question {idx + 1} of {quizData.questions.length}
                      </span>
                      {selectedKey && (
                        <span className="text-xs font-medium text-slate-500">
                          Selected: Option {selectedKey}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                      {q.question}
                    </h4>

                    {/* 4 Answer Options */}
                    <div className="grid grid-cols-1 gap-2.5 mt-1">
                      {q.options.map((opt) => {
                        const isSelected = selectedKey === opt.key;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.key)}
                            className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200 text-indigo-950 font-medium'
                                : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-600'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="text-sm leading-relaxed pt-0.5">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Answer Key & Explanations (Displayed BELOW the questions) */}
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xl font-bold text-slate-900">
                      Answer Key & Detailed Explanations
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Review correct answers and the rationale for each question below.
                  </p>
                </div>

                {answeredCount > 0 && (
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-medium">Your Score</div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {correctCount} / {totalQuestions} ({Math.round((correctCount / totalQuestions) * 100)}%)
                      </div>
                    </div>
                    {correctCount === totalQuestions ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <HelpCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                )}
              </div>

              {/* Explanations List */}
              <div className="flex flex-col gap-6">
                {quizData.questions.map((q, idx) => {
                  const correctOption = q.options.find((o) => o.key === q.correctAnswer);
                  const studentSelected = userAnswers[q.id];
                  const hasAnswered = !!studentSelected;
                  const isCorrect = hasAnswered && studentSelected === q.correctAnswer;

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">
                          Question {idx + 1}
                        </span>

                        {hasAnswered && (
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Correct (You chose {studentSelected})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                Incorrect (You chose {studentSelected})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-900">
                        {q.question}
                      </p>

                      {/* Correct Answer Highlight */}
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {q.correctAnswer}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                            Correct Answer: Option {q.correctAnswer}
                          </div>
                          <div className="text-sm font-medium text-emerald-950 mt-0.5">
                            {correctOption?.text}
                          </div>
                        </div>
                      </div>

                      {/* Explanation Text */}
                      <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-900 block mb-1">
                          Explanation:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action row at bottom */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const textarea = document.getElementById('study-notes-input');
                    if (textarea) textarea.focus();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  Edit notes or generate another quiz
                </button>

                <button
                  type="button"
                  onClick={handleClearSelections}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Clear My Practice Answers
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Informational Guidance (When no quiz generated yet) */}
        {!quizData && !isLoading && (
          <section id="instructions" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Enter Study Notes</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste your lecture notes, textbook summaries, definitions, or study cheat-sheets into the text box above.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Choose 1 to 5 Questions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select exactly how many practice questions you want to generate to test your understanding.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Practice & Study Explanations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Answer each 4-option question and consult the comprehensive answer key and explanations directly below.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CampusQuiz</span>
            <span>·</span>
            <span>University Study Companion</span>
          </div>
          <div>
            <span>Powered by Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
