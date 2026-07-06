"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { generateRecommendation } from "@/features/analytics/recommendationEngine";
import { literacyActivity } from "@/features/student/activityContent";
import { saveActivityResult } from "@/shared/storage/activityResults";
import type { ConfidenceLevel, StudentResponse } from "@/shared/types/activity";

const confidenceLevels: ConfidenceLevel[] = [1, 2, 3, 4, 5];

export function StudentActivity() {
  const [studentName, setStudentName] = useState("Demo Student");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(3);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [rereadCount, setRereadCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [submittedResponse, setSubmittedResponse] = useState<StudentResponse | null>(
    null,
  );

  const canSubmit = studentName.trim().length > 0 && selectedAnswer.length > 0;

  const elapsedSeconds = useMemo(() => {
    if (!submittedResponse) {
      return null;
    }

    return submittedResponse.timeOnTaskSeconds;
  }, [submittedResponse]);

  function handleAnswerChange(answer: string) {
    setSelectedAnswer(answer);
    setAttemptCount((currentCount) => currentCount + 1);
  }

  function handleHintClick() {
    setHintVisible(true);
    setHintCount((currentCount) => currentCount + 1);
  }

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const response: StudentResponse = {
      id: crypto.randomUUID(),
      studentName: studentName.trim(),
      activityId: literacyActivity.id,
      selectedAnswer,
      isCorrect: selectedAnswer === literacyActivity.correctAnswer,
      confidence,
      hintCount,
      rereadCount,
      attemptCount: Math.max(attemptCount, 1),
      timeOnTaskSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      submittedAt,
    };

    saveActivityResult({
      response,
      recommendation: generateRecommendation(response),
    });
    setSubmittedResponse(response);
  }

  if (submittedResponse) {
    return (
      <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Activity submitted
          </p>
          <div>
            <h1 className="text-3xl font-bold">Nice work, {submittedResponse.studentName}</h1>
            <p className="mt-3 text-slate-700">
              Your interaction data has been saved for the facilitator dashboard.
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-emerald-50 p-4">
              <dt className="text-sm text-emerald-900">Accuracy</dt>
              <dd className="text-xl font-semibold">
                {submittedResponse.isCorrect ? "Correct" : "Needs review"}
              </dd>
            </div>
            <div className="rounded-md bg-sky-50 p-4">
              <dt className="text-sm text-sky-900">Confidence</dt>
              <dd className="text-xl font-semibold">{submittedResponse.confidence}/5</dd>
            </div>
            <div className="rounded-md bg-amber-50 p-4">
              <dt className="text-sm text-amber-900">Time</dt>
              <dd className="text-xl font-semibold">{elapsedSeconds}s</dd>
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

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            Back to MVP overview
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Student activity
          </p>
          <h1 className="mt-2 text-3xl font-bold">{literacyActivity.title}</h1>

          <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="student-name">
            Student name
          </label>
          <input
            id="student-name"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <article className="mt-6 rounded-md bg-[#fffaf0] p-5 leading-8 text-slate-800">
            {literacyActivity.passage}
          </article>

          <button
            type="button"
            onClick={() => setRereadCount((currentCount) => currentCount + 1)}
            className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
          >
            I reread the passage
          </button>

          <fieldset className="mt-8">
            <legend className="text-lg font-semibold">{literacyActivity.question}</legend>
            <div className="mt-4 grid gap-3">
              {literacyActivity.answers.map((answer) => (
                <label
                  key={answer}
                  className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-4 transition hover:border-emerald-400"
                >
                  <input
                    type="radio"
                    name="answer"
                    value={answer}
                    checked={selectedAnswer === answer}
                    onChange={() => handleAnswerChange(answer)}
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <span>{answer}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">Support tools</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These controls create the interaction data used by the recommendation engine.
            </p>
          </div>

          <div className="rounded-md bg-sky-50 p-4">
            <p className="text-sm font-semibold text-sky-950">Hint use</p>
            {hintVisible ? (
              <p className="mt-2 text-sm leading-6 text-sky-900">{literacyActivity.hint}</p>
            ) : (
              <button
                type="button"
                onClick={handleHintClick}
                className="mt-3 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Show hint
              </button>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Confidence rating</legend>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {confidenceLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidence(level)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    confidence === level
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-100"
                  }`}
                  aria-pressed={confidence === level}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">1 = not sure, 5 = very sure</p>
          </fieldset>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Hints</p>
              <p className="text-lg font-bold">{hintCount}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Rereads</p>
              <p className="text-lg font-bold">{rereadCount}</p>
            </div>
            <div className="rounded-md bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Attempts</p>
              <p className="text-lg font-bold">{attemptCount}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-auto rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Submit activity
          </button>
        </aside>
      </section>
    </main>
  );
}
