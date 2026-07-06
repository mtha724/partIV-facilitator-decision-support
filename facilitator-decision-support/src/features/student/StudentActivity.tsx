"use client";

import Link from "next/link";
import { useState } from "react";
import { generateRecommendation } from "@/features/analytics/recommendationEngine";
import { literacyActivity } from "@/features/student/activityContent";
import { saveActivityResult } from "@/shared/storage/activityResults";
import type {
  ConfidenceLevel,
  DifficultyLevel,
  QuestionResponse,
  StudentResponse,
} from "@/shared/types/activity";

type Stage = "welcome" | "passage" | "question" | "reflection" | "finished";

type DraftQuestionResponse = Omit<
  QuestionResponse,
  "isCorrect" | "confidence" | "questionTimeSeconds"
> & {
  confidence: ConfidenceLevel | null;
  questionTimeSeconds: number;
};

const confidenceOptions: Array<{
  value: ConfidenceLevel;
  label: string;
}> = [
  { value: 4, label: "Very confident" },
  { value: 3, label: "Mostly confident" },
  { value: 2, label: "Not sure" },
  { value: 1, label: "Guessing" },
];

const difficultyOptions: Array<{
  value: DifficultyLevel;
  label: string;
}> = [
  { value: 1, label: "Easy" },
  { value: 2, label: "A little tricky" },
  { value: 3, label: "Challenging" },
];

function secondsSince(timestamp: number) {
  return Math.max(1, Math.round((Date.now() - timestamp) / 1000));
}

function createDraftResponses(): DraftQuestionResponse[] {
  return literacyActivity.questions.map((question) => ({
    questionId: question.id,
    selectedAnswer: "",
    confidence: null,
    hintCount: 0,
    answerChangeCount: 0,
    firstInteractionSeconds: null,
    questionTimeSeconds: 0,
    passageRevisitCount: 0,
  }));
}

export function StudentActivity() {
  const [studentName, setStudentName] = useState("Demo Student");
  const [stage, setStage] = useState<Stage>("welcome");
  const [activityStartedAt, setActivityStartedAt] = useState(() => Date.now());
  const [readingStartedAt, setReadingStartedAt] = useState(() => Date.now());
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [readingTimeSeconds, setReadingTimeSeconds] = useState(0);
  const [isReviewingPassage, setIsReviewingPassage] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [draftResponses, setDraftResponses] = useState(createDraftResponses);
  const [perceivedDifficulty, setPerceivedDifficulty] =
    useState<DifficultyLevel | null>(null);
  const [overallConfidence, setOverallConfidence] =
    useState<ConfidenceLevel | null>(null);
  const [submittedResponse, setSubmittedResponse] =
    useState<StudentResponse | null>(null);

  const currentQuestion = literacyActivity.questions[currentQuestionIndex];
  const currentDraft = draftResponses[currentQuestionIndex];
  const canMoveFromQuestion =
    currentDraft.selectedAnswer.length > 0 && currentDraft.confidence !== null;
  const canFinishReflection =
    perceivedDifficulty !== null && overallConfidence !== null;

  function updateCurrentQuestion(
    updater: (current: DraftQuestionResponse) => DraftQuestionResponse,
  ) {
    setDraftResponses((responses) =>
      responses.map((response, index) =>
        index === currentQuestionIndex ? updater(response) : response,
      ),
    );
  }

  function beginActivity() {
    const now = Date.now();
    setActivityStartedAt(now);
    setReadingStartedAt(now);
    setIsReviewingPassage(false);
    setStage("passage");
  }

  function beginQuestions() {
    setReadingTimeSeconds((current) => current + secondsSince(readingStartedAt));
    setIsReviewingPassage(false);
    setQuestionStartedAt(Date.now());
    setStage("question");
  }

  function revisitPassage() {
    const elapsedQuestionSeconds = secondsSince(questionStartedAt);
    updateCurrentQuestion((response) => ({
      ...response,
      questionTimeSeconds: response.questionTimeSeconds + elapsedQuestionSeconds,
      passageRevisitCount: response.passageRevisitCount + 1,
    }));
    setReadingStartedAt(Date.now());
    setIsReviewingPassage(true);
    setStage("passage");
  }

  function returnToQuestion() {
    setReadingTimeSeconds((current) => current + secondsSince(readingStartedAt));
    setIsReviewingPassage(false);
    setQuestionStartedAt(Date.now());
    setStage("question");
  }

  function chooseAnswer(answer: string) {
    const elapsedBeforeInteraction = secondsSince(questionStartedAt);

    updateCurrentQuestion((response) => ({
      ...response,
      selectedAnswer: answer,
      answerChangeCount:
        response.selectedAnswer.length > 0 && response.selectedAnswer !== answer
          ? response.answerChangeCount + 1
          : response.answerChangeCount,
      firstInteractionSeconds:
        response.firstInteractionSeconds ?? elapsedBeforeInteraction,
    }));
  }

  function showHint() {
    updateCurrentQuestion((response) => ({
      ...response,
      hintCount: response.hintCount + 1,
      firstInteractionSeconds:
        response.firstInteractionSeconds ?? secondsSince(questionStartedAt),
    }));
  }

  function setQuestionConfidence(confidence: ConfidenceLevel) {
    updateCurrentQuestion((response) => ({
      ...response,
      confidence,
    }));
  }

  function moveToNextQuestion() {
    if (!canMoveFromQuestion) {
      return;
    }

    const elapsedQuestionSeconds = secondsSince(questionStartedAt);
    updateCurrentQuestion((response) => ({
      ...response,
      questionTimeSeconds: response.questionTimeSeconds + elapsedQuestionSeconds,
    }));

    if (currentQuestionIndex === literacyActivity.questions.length - 1) {
      setStage("reflection");
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
    setQuestionStartedAt(Date.now());
  }

  function finishActivity() {
    if (!canFinishReflection) {
      return;
    }

    const questionResponses: QuestionResponse[] = draftResponses.map(
      (response) => {
        const question = literacyActivity.questions.find(
          (item) => item.id === response.questionId,
        );

        return {
          ...response,
          confidence: response.confidence ?? 1,
          isCorrect: response.selectedAnswer === question?.correctAnswer,
        };
      },
    );

    const submittedAt = new Date().toISOString();
    const response: StudentResponse = {
      id: crypto.randomUUID(),
      studentName: studentName.trim(),
      activityId: literacyActivity.id,
      readingTimeSeconds,
      timeOnTaskSeconds: secondsSince(activityStartedAt),
      questionResponses,
      perceivedDifficulty,
      overallConfidence,
      completed: true,
      submittedAt,
    };

    saveActivityResult({
      response,
      recommendation: generateRecommendation(response),
    });
    setSubmittedResponse(response);
    setStage("finished");
  }

  if (stage === "finished" && submittedResponse) {
    const correctCount = submittedResponse.questionResponses.filter(
      (response) => response.isCorrect,
    ).length;

    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Finished
          </p>
          <h1 className="text-3xl font-bold">Nice work, {submittedResponse.studentName}</h1>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-emerald-50 p-4">
              <dt className="text-sm text-emerald-900">Answers</dt>
              <dd className="text-xl font-semibold">
                {correctCount}/{submittedResponse.questionResponses.length}
              </dd>
            </div>
            <div className="rounded-md bg-sky-50 p-4">
              <dt className="text-sm text-sky-900">Reading time</dt>
              <dd className="text-xl font-semibold">
                {submittedResponse.readingTimeSeconds}s
              </dd>
            </div>
            <div className="rounded-md bg-amber-50 p-4">
              <dt className="text-sm text-amber-900">Total time</dt>
              <dd className="text-xl font-semibold">
                {submittedResponse.timeOnTaskSeconds}s
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/facilitator"
              className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View facilitator dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:bg-slate-100"
            >
              Try activity again
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "welcome") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            Back to MVP overview
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Reading activity
            </p>
            <h1 className="mt-2 text-3xl font-bold">{literacyActivity.title}</h1>
          </div>

          <label className="block text-sm font-bold text-slate-800" htmlFor="student-name">
            Your name
          </label>
          <input
            id="student-name"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <button
            type="button"
            onClick={beginActivity}
            disabled={studentName.trim().length === 0}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Begin
          </button>
        </section>
      </main>
    );
  }

  if (stage === "passage") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Read the passage
          </p>
          <article className="rounded-md bg-[#fffaf0] p-5 text-lg leading-9 text-slate-800">
            {literacyActivity.passage}
          </article>
          <button
            type="button"
            onClick={isReviewingPassage ? returnToQuestion : beginQuestions}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {isReviewingPassage ? "Return to question" : "Continue"}
          </button>
        </section>
      </main>
    );
  }

  if (stage === "reflection") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Learner reflection
            </p>
            <h1 className="mt-2 text-3xl font-bold">Almost done</h1>
          </div>

          <fieldset>
            <legend className="text-lg font-bold">
              How difficult did you find this activity?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPerceivedDifficulty(option.value)}
                  className={`rounded-md border px-4 py-3 text-sm font-bold ${
                    perceivedDifficulty === option.value
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-bold">
              How confident do you feel about your answers?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {confidenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOverallConfidence(option.value)}
                  className={`rounded-md border px-4 py-3 text-sm font-bold ${
                    overallConfidence === option.value
                      ? "border-sky-700 bg-sky-700 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={finishActivity}
            disabled={!canFinishReflection}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Finish
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Question {currentQuestionIndex + 1} of {literacyActivity.questions.length}
          </p>
          <button
            type="button"
            onClick={revisitPassage}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition hover:bg-slate-100"
          >
            Back to passage
          </button>
        </div>

        <fieldset>
          <legend className="text-2xl font-bold">{currentQuestion.prompt}</legend>
          <div className="mt-4 grid gap-3">
            {currentQuestion.answers.map((answer) => (
              <label
                key={answer}
                className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-4 text-base transition hover:border-emerald-500"
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={answer}
                  checked={currentDraft.selectedAnswer === answer}
                  onChange={() => chooseAnswer(answer)}
                  className="mt-1 h-5 w-5 accent-emerald-700"
                />
                <span>{answer}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-md bg-sky-50 p-4">
          <button
            type="button"
            onClick={showHint}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-800"
          >
            Show hint
          </button>
          {currentDraft.hintCount > 0 ? (
            <p className="mt-3 text-sm leading-6 text-sky-900">{currentQuestion.hint}</p>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-lg font-bold">
            How confident are you about your answer?
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {confidenceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuestionConfidence(option.value)}
                className={`rounded-md border px-4 py-3 text-sm font-bold ${
                  currentDraft.confidence === option.value
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={moveToNextQuestion}
          disabled={!canMoveFromQuestion}
          className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {currentQuestionIndex === literacyActivity.questions.length - 1
            ? "Continue to reflection"
            : "Next question"}
        </button>
      </section>
    </main>
  );
}
