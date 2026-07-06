"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  clearActivityResults,
  getActivityResultsSnapshot,
  getServerActivityResultsSnapshot,
  subscribeActivityResults,
} from "@/shared/storage/activityResults";
import type { ActivityResult, QuestionResponse } from "@/shared/types/activity";

const severityStyles = {
  high: "bg-rose-100 text-rose-900 border-rose-200",
  medium: "bg-amber-100 text-amber-950 border-amber-200",
  low: "bg-emerald-100 text-emerald-950 border-emerald-200",
};

function getQuestionResponses(result: ActivityResult): QuestionResponse[] {
  return Array.isArray(result.response.questionResponses)
    ? result.response.questionResponses
    : [];
}

function getAccuracyLabel(result: ActivityResult) {
  const questions = getQuestionResponses(result);

  if (questions.length === 0) {
    return "Not captured";
  }

  const correct = questions.filter((question) => question.isCorrect).length;
  return `${correct}/${questions.length}`;
}

function getTotalHints(questions: QuestionResponse[]) {
  return questions.reduce((total, question) => total + question.hintCount, 0);
}

function getTotalAnswerChanges(questions: QuestionResponse[]) {
  return questions.reduce(
    (total, question) => total + question.answerChangeCount,
    0,
  );
}

function getTotalPassageRevisits(questions: QuestionResponse[]) {
  return questions.reduce(
    (total, question) => total + question.passageRevisitCount,
    0,
  );
}

function getAverageConfidence(questions: QuestionResponse[]) {
  if (questions.length === 0) {
    return 0;
  }

  return (
    questions.reduce((total, question) => total + question.confidence, 0) /
    questions.length
  );
}

function getAverageFirstInteraction(questions: QuestionResponse[]) {
  const capturedValues = questions
    .map((question) => question.firstInteractionSeconds)
    .filter((value): value is number => value !== null);

  if (capturedValues.length === 0) {
    return 0;
  }

  return (
    capturedValues.reduce((total, value) => total + value, 0) /
    capturedValues.length
  );
}

export function FacilitatorDashboard() {
  const results = useSyncExternalStore(
    subscribeActivityResults,
    getActivityResultsSnapshot,
    getServerActivityResultsSnapshot,
  );

  const classSummary = useMemo(() => {
    const completed = results.length;
    const needsSupport = results.filter((result) =>
      result.recommendation.indicators.some(
        (indicator) => indicator.severity === "high",
      ),
    ).length;
    const allQuestions = results.flatMap(getQuestionResponses);
    const averageConfidence = getAverageConfidence(allQuestions);
    const possibleTaskConcerns = results.filter((result) =>
      result.recommendation.indicators.some(
        (indicator) => indicator.id === "task-processing",
      ),
    ).length;

    return {
      completed,
      needsSupport,
      averageConfidence,
      possibleTaskConcerns,
    };
  }, [results]);

  function handleClearDemoData() {
    clearActivityResults();
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              Back to MVP overview
            </Link>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Facilitator dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Literacy support overview</h1>
            <p className="mt-3 max-w-2xl text-slate-700">
              Natural activity data is translated into support indicators and a
              recommended facilitator action.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/student"
              className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Run student activity
            </Link>
            <button
              type="button"
              onClick={handleClearDemoData}
              className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:bg-slate-100"
            >
              Clear demo data
            </button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Completed activities</p>
            <p className="mt-2 text-3xl font-bold">{classSummary.completed}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Priority check-ins</p>
            <p className="mt-2 text-3xl font-bold">{classSummary.needsSupport}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Task-processing signals</p>
            <p className="mt-2 text-3xl font-bold">
              {classSummary.possibleTaskConcerns}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Average confidence</p>
            <p className="mt-2 text-3xl font-bold">
              {classSummary.averageConfidence.toFixed(1)}/4
            </p>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">No student activity yet</h2>
            <p className="mt-2 text-slate-600">
              Complete the student task once to generate the first support recommendation.
            </p>
            <Link
              href="/student"
              className="mt-5 inline-flex rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Start student demo
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((result) => {
              const questions = getQuestionResponses(result);
              const averageFirstInteraction = getAverageFirstInteraction(questions);

              return (
                <article
                  key={result.response.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{result.response.studentName}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Submitted {new Date(result.response.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold">
                      Accuracy {getAccuracyLabel(result)} · Difficulty{" "}
                      {result.response.perceivedDifficulty ?? "not captured"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-md bg-slate-50 p-4">
                      <h3 className="font-semibold">Observed interaction data</h3>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-slate-500">Reading time</dt>
                          <dd className="font-semibold">
                            {result.response.readingTimeSeconds ?? 0}s
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Total time</dt>
                          <dd className="font-semibold">
                            {result.response.timeOnTaskSeconds}s
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Hints opened</dt>
                          <dd className="font-semibold">{getTotalHints(questions)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Passage revisits</dt>
                          <dd className="font-semibold">
                            {getTotalPassageRevisits(questions)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Answer changes</dt>
                          <dd className="font-semibold">
                            {getTotalAnswerChanges(questions)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">First-answer delay</dt>
                          <dd className="font-semibold">
                            {Math.round(averageFirstInteraction)}s avg
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Answer confidence</dt>
                          <dd className="font-semibold">
                            {getAverageConfidence(questions).toFixed(1)}/4
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Reflection confidence</dt>
                          <dd className="font-semibold">
                            {result.response.overallConfidence ?? "not captured"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-md bg-emerald-50 p-4">
                      <h3 className="font-semibold">Recommendation</h3>
                      <p className="mt-2 text-lg font-bold">
                        {result.recommendation.summary}
                      </p>
                      <p className="mt-2 leading-7 text-slate-700">
                        {result.recommendation.action}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {result.recommendation.indicators.map((indicator) => (
                      <span
                        key={indicator.id}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                          severityStyles[indicator.severity]
                        }`}
                        title={indicator.evidence}
                      >
                        {indicator.label}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
