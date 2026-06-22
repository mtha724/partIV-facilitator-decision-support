import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          Facilitator Decision Support
        </p>

        <h1 className="mb-4 text-center text-4xl font-bold sm:text-5xl">
          Understand learner support needs more clearly.
        </h1>

        <p className="mb-10 max-w-2xl text-center text-slate-300">
          A prototype system that collects student interaction data from
          literacy activities and turns it into explainable facilitator support
          recommendations.
        </p>

        <div className="grid w-full gap-6 sm:grid-cols-2">
          <Link
            href="/facilitator"
            className="rounded-2xl border border-cyan-400/30 bg-slate-900 p-6 hover:bg-slate-800"
          >
            <h2 className="mb-3 text-2xl font-semibold text-cyan-200">
              Facilitator View
            </h2>
            <p className="text-slate-300">
              View class insights, student support indicators, and suggested
              facilitation actions.
            </p>
          </Link>

          <Link
            href="/student"
            className="rounded-2xl border border-purple-400/30 bg-slate-900 p-6 hover:bg-slate-800"
          >
            <h2 className="mb-3 text-2xl font-semibold text-purple-200">
              Student Activity
            </h2>
            <p className="text-slate-300">
              Complete a short literacy activity so the system can collect
              interaction data.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}