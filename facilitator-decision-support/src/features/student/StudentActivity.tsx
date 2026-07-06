"use client";

import Link from "next/link";
import { useState } from "react";
import { generateRecommendation } from "@/features/analytics/recommendationEngine";
import { literacyActivity } from "@/features/student/activityContent";
import {
  loadActivityResults,
  saveActivityResult,
} from "@/shared/storage/activityResults";
import type {
  ActivitySession,
  ConfidenceLevel,
  DifficultyLevel,
  QuestionResponse,
  StudentResponse,
} from "@/shared/types/activity";

type Stage = "welcome" | "instructions" | "story" | "question" | "reflection" | "finished";

const confidenceOptions: Array<{
  value: ConfidenceLevel;
  label: string;
}> = [
  { value: 4, label: "I know it" },
  { value: 3, label: "I think so" },
  { value: 2, label: "Not sure" },
  { value: 1, label: "Just guessing" },
];

const difficultyOptions: Array<{
  value: DifficultyLevel;
  label: string;
}> = [
  { value: 1, label: "Easy to follow" },
  { value: 2, label: "Some parts were tricky" },
  { value: 3, label: "I got stuck" },
];

const progressSteps: Array<{
  stage: Stage;
  label: string;
}> = [
  { stage: "welcome", label: "Welcome" },
  { stage: "instructions", label: "Instructions" },
  { stage: "story", label: "Reading" },
  { stage: "question", label: "Questions" },
  { stage: "reflection", label: "Reflection" },
  { stage: "finished", label: "Finished" },
];

function secondsSince(timestamp: number) {
  return Math.max(1, Math.round((Date.now() - timestamp) / 1000));
}

function createQuestionResponses(): ActivitySession["questionResponses"] {
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

function createSession(studentName: string): ActivitySession {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    studentName,
    activityId: literacyActivity.id,
    startedAt: now,
    readingStartedAt: null,
    questionStartedAt: null,
    readingTimeSeconds: 0,
    currentQuestionIndex: 0,
    questionResponses: createQuestionResponses(),
    perceivedDifficulty: null,
    reflectionComment: "",
    completed: false,
  };
}

function Progress({ stage }: { stage: Stage }) {
  const activeIndex = progressSteps.findIndex((step) => step.stage === stage);

  return (
    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600">
      <div className="flex gap-2" aria-label="Activity progress">
        {progressSteps.slice(1).map((step, index) => (
          <span
            key={step.stage}
            className={`h-3 w-3 rounded-full ${
              index + 1 <= activeIndex ? "bg-emerald-700" : "bg-slate-300"
            }`}
          />
        ))}
      </div>
      <span>{progressSteps[activeIndex]?.label ?? "Reading activity"}</span>
    </div>
  );
}

function updateQuestionAt(
  session: ActivitySession,
  questionIndex: number,
  updater: (
    current: ActivitySession["questionResponses"][number],
  ) => ActivitySession["questionResponses"][number],
): ActivitySession {
  return {
    ...session,
    questionResponses: session.questionResponses.map((response, index) =>
      index === questionIndex ? updater(response) : response,
    ),
  };
}

export function StudentActivity() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [session, setSession] = useState<ActivitySession>(() =>
    createSession("Student 1"),
  );
  const [isReviewingStory, setIsReviewingStory] = useState(false);
  const [submittedResponse, setSubmittedResponse] =
    useState<StudentResponse | null>(null);

  const currentQuestionIndex = session.currentQuestionIndex;
  const currentQuestion = literacyActivity.questions[currentQuestionIndex];
  const currentResponse = session.questionResponses[currentQuestionIndex];
  const canMoveFromQuestion =
    currentResponse.selectedAnswer.length > 0 && currentResponse.confidence !== null;
  const canFinishReflection = session.perceivedDifficulty !== null;

  function startActivity() {
    const nextStudentNumber = loadActivityResults().length + 1;
    setSession(createSession(`Student ${nextStudentNumber}`));
    setStage("instructions");
  }

  function startStory() {
    setSession((currentSession) => ({
      ...currentSession,
      readingStartedAt: Date.now(),
    }));
    setIsReviewingStory(false);
    setStage("story");
  }

  function startQuestions() {
    setSession((currentSession) => ({
      ...currentSession,
      readingTimeSeconds:
        currentSession.readingTimeSeconds +
        (currentSession.readingStartedAt
          ? secondsSince(currentSession.readingStartedAt)
          : 0),
      readingStartedAt: null,
      questionStartedAt: Date.now(),
    }));
    setIsReviewingStory(false);
    setStage("question");
  }

  function backToStory() {
    setSession((currentSession) => {
      const elapsedQuestionSeconds = currentSession.questionStartedAt
        ? secondsSince(currentSession.questionStartedAt)
        : 0;

      return {
        ...updateQuestionAt(
          currentSession,
          currentSession.currentQuestionIndex,
          (response) => ({
            ...response,
            questionTimeSeconds:
              response.questionTimeSeconds + elapsedQuestionSeconds,
            passageRevisitCount: response.passageRevisitCount + 1,
          }),
        ),
        readingStartedAt: Date.now(),
        questionStartedAt: null,
      };
    });
    setIsReviewingStory(true);
    setStage("story");
  }

  function returnToQuestion() {
    setSession((currentSession) => ({
      ...currentSession,
      readingTimeSeconds:
        currentSession.readingTimeSeconds +
        (currentSession.readingStartedAt
          ? secondsSince(currentSession.readingStartedAt)
          : 0),
      readingStartedAt: null,
      questionStartedAt: Date.now(),
    }));
    setIsReviewingStory(false);
    setStage("question");
  }

  function chooseAnswer(answer: string) {
    setSession((currentSession) => {
      const questionStartedAt = currentSession.questionStartedAt ?? Date.now();
      const elapsedBeforeInteraction = secondsSince(questionStartedAt);

      return updateQuestionAt(
        currentSession,
        currentSession.currentQuestionIndex,
        (response) => ({
          ...response,
          selectedAnswer: answer,
          answerChangeCount:
            response.selectedAnswer.length > 0 && response.selectedAnswer !== answer
              ? response.answerChangeCount + 1
              : response.answerChangeCount,
          firstInteractionSeconds:
            response.firstInteractionSeconds ?? elapsedBeforeInteraction,
        }),
      );
    });
  }

  function showHint() {
    setSession((currentSession) =>
      updateQuestionAt(
        currentSession,
        currentSession.currentQuestionIndex,
        (response) => ({
          ...response,
          hintCount: response.hintCount + 1,
          firstInteractionSeconds:
            response.firstInteractionSeconds ??
            (currentSession.questionStartedAt
              ? secondsSince(currentSession.questionStartedAt)
              : null),
        }),
      ),
    );
  }

  function setQuestionConfidence(confidence: ConfidenceLevel) {
    setSession((currentSession) =>
      updateQuestionAt(
        currentSession,
        currentSession.currentQuestionIndex,
        (response) => ({
          ...response,
          confidence,
        }),
      ),
    );
  }

  function moveToNextQuestion() {
    if (!canMoveFromQuestion) {
      return;
    }

    setSession((currentSession) => {
      const elapsedQuestionSeconds = currentSession.questionStartedAt
        ? secondsSince(currentSession.questionStartedAt)
        : 0;
      const updatedSession = updateQuestionAt(
        currentSession,
        currentSession.currentQuestionIndex,
        (response) => ({
          ...response,
          questionTimeSeconds: response.questionTimeSeconds + elapsedQuestionSeconds,
        }),
      );

      if (
        currentSession.currentQuestionIndex ===
        literacyActivity.questions.length - 1
      ) {
        return {
          ...updatedSession,
          questionStartedAt: null,
        };
      }

      return {
        ...updatedSession,
        currentQuestionIndex: currentSession.currentQuestionIndex + 1,
        questionStartedAt: Date.now(),
      };
    });

    if (currentQuestionIndex === literacyActivity.questions.length - 1) {
      setStage("reflection");
    }
  }

  function finishActivity() {
    if (!canFinishReflection || session.perceivedDifficulty === null) {
      return;
    }

    const questionResponses: QuestionResponse[] = session.questionResponses.map(
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
    const averageConfidence = Math.round(
      questionResponses.reduce((total, response) => total + response.confidence, 0) /
        questionResponses.length,
    ) as ConfidenceLevel;

    const submittedAt = new Date().toISOString();
    const response: StudentResponse = {
      id: session.id,
      studentName: session.studentName,
      activityId: session.activityId,
      readingTimeSeconds: session.readingTimeSeconds,
      timeOnTaskSeconds: secondsSince(session.startedAt),
      questionResponses,
      perceivedDifficulty: session.perceivedDifficulty,
      overallConfidence: averageConfidence,
      reflectionComment: session.reflectionComment.trim() || undefined,
      completed: true,
      submittedAt,
    };

    saveActivityResult({
      response,
      recommendation: generateRecommendation(response),
    });
    setSubmittedResponse(response);
    setSession((currentSession) => ({
      ...currentSession,
      completed: true,
    }));
    setStage("finished");
  }

  if (stage === "finished" && submittedResponse) {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
          <Progress stage={stage} />
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Finished
          </p>
          <h1 className="text-3xl font-bold">Great job!</h1>
          <p className="text-lg leading-8 text-slate-700">
            You&apos;ve finished today&apos;s activity. Thank you!
          </p>

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
          <Progress stage={stage} />
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            Back to MVP overview
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Reading Activity
            </p>
            <h1 className="mt-2 text-3xl font-bold">Today you&apos;ll read a short story.</h1>
          </div>

          <div className="space-y-3 text-lg leading-8 text-slate-700">
            <p>After you&apos;ve finished reading, you&apos;ll answer a few questions.</p>
            <p>There are no right or wrong ways to learn. Just try your best.</p>
          </div>

          <button
            type="button"
            onClick={startActivity}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Start
          </button>
        </section>
      </main>
    );
  }

  if (stage === "instructions") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Progress stage={stage} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Before you begin
            </p>
            <h1 className="mt-2 text-3xl font-bold">How the activity works</h1>
          </div>

          <ul className="space-y-4 text-lg leading-8 text-slate-700">
            <li>Read the story carefully.</li>
            <li>You can go back and read it again at any time.</li>
            <li>If you need help, press the Hint button.</li>
            <li>When you&apos;re ready, press Continue.</li>
          </ul>

          <button
            type="button"
            onClick={startStory}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Continue
          </button>
        </section>
      </main>
    );
  }

  if (stage === "story") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Progress stage={stage} />
          <article className="rounded-lg border border-amber-200 bg-[#fffaf0] p-6 text-slate-900">
            <p className="text-center text-sm font-bold uppercase tracking-wide text-amber-800">
              Story
            </p>
            <h1 className="mt-2 text-center text-3xl font-bold">
              {literacyActivity.storyTitle}
            </h1>
            <div className="mx-auto mt-6 grid h-32 max-w-sm place-items-center rounded-lg bg-amber-100 text-sm font-semibold uppercase tracking-wide text-amber-900">
              Story illustration
            </div>
            <p className="mt-6 text-lg leading-9">{literacyActivity.passage}</p>
          </article>
          <button
            type="button"
            onClick={isReviewingStory ? returnToQuestion : startQuestions}
            className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {isReviewingStory ? "Return to question" : "Continue"}
          </button>
        </section>
      </main>
    );
  }

  if (stage === "reflection") {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Progress stage={stage} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Learner reflection
            </p>
            <h1 className="mt-2 text-3xl font-bold">Almost done</h1>
          </div>

          <fieldset>
            <legend className="text-lg font-bold">
              How did the activity feel overall?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {difficultyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setSession((currentSession) => ({
                      ...currentSession,
                      perceivedDifficulty: option.value,
                    }))
                  }
                  className={`rounded-md border px-4 py-3 text-sm font-bold ${
                    session.perceivedDifficulty === option.value
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-lg font-bold" htmlFor="reflection-comment">
            What did you find most difficult today? <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="reflection-comment"
            value={session.reflectionComment}
            onChange={(event) =>
              setSession((currentSession) => ({
                ...currentSession,
                reflectionComment: event.target.value,
              }))
            }
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

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
        <Progress stage={stage} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Question {currentQuestionIndex + 1} of {literacyActivity.questions.length}
          </p>
          <button
            type="button"
            onClick={backToStory}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold transition hover:bg-slate-100"
          >
            Back to story
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
                  checked={currentResponse.selectedAnswer === answer}
                  onChange={() => chooseAnswer(answer)}
                  className="mt-1 h-5 w-5 accent-emerald-700"
                />
                <span>{answer}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
                  currentResponse.confidence === option.value
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
          <button
            type="button"
            onClick={showHint}
            className="text-left text-sm font-bold text-sky-900"
          >
            Need a hint?
          </button>
          {currentResponse.hintCount > 0 ? (
            <p className="mt-3 text-sm leading-6 text-sky-900">
              Hint: {currentQuestion.hint}
            </p>
          ) : null}
        </div>

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
