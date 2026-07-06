"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  clearActivityResults,
  getActivityResultsSnapshot,
  getServerActivityResultsSnapshot,
  subscribeActivityResults,
} from "@/shared/storage/activityResults";

const severityStyles = {
  high: "bg-rose-100 text-rose-900 border-rose-200",
  medium: "bg-amber-100 text-amber-950 border-amber-200",
  low: "bg-emerald-100 text-emerald-950 border-emerald-200",
};

export function FacilitatorDashboard() {
  const results = useSyncExternalStore(
    subscribeActivityResults,
    getActivityResultsSnapshot,
    getServerActivityResultsSnapshot,
  );

  const classSummary = useMemo(() => {
    const completed = results.length;
    const needsSupport = results.filter((result) =>
      result.recommendation.indicators.some((indicator) => indicator.severity === "high"),
    ).length;
    const averageConfidence =
      completed === 0
        ? 0
        : results.reduce((total, result) => total + result.response.confidence, 0) /
          completed;

    return {
      completed,
      needsSupport,
      averageConfidence,
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
              Student activity data is translated into support indicators and a recommended
              facilitator action.
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Completed activities</p>
            <p className="mt-2 text-3xl font-bold">{classSummary.completed}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Priority check-ins</p>
            <p className="mt-2 text-3xl font-bold">{classSummary.needsSupport}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Average confidence</p>
            <p className="mt-2 text-3xl font-bold">
              {classSummary.averageConfidence.toFixed(1)}/5
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
            {results.map((result) => (
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
                    {result.response.isCorrect ? "Correct" : "Incorrect"} · Confidence{" "}
                    {result.response.confidence}/5
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-md bg-slate-50 p-4">
                    <h3 className="font-semibold">Interaction data</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-slate-500">Hints</dt>
                        <dd className="font-semibold">{result.response.hintCount}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Rereads</dt>
                        <dd className="font-semibold">{result.response.rereadCount}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Attempts</dt>
                        <dd className="font-semibold">{result.response.attemptCount}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Time</dt>
                        <dd className="font-semibold">
                          {result.response.timeOnTaskSeconds}s
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-md bg-emerald-50 p-4">
                    <h3 className="font-semibold">Recommendation</h3>
                    <p className="mt-2 text-lg font-bold">{result.recommendation.summary}</p>
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
