import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Part IV facilitator decision support
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Student activity becomes facilitator action.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            This MVP demonstrates the proof-of-concept pipeline: learner interaction
            data is captured, interpreted with transparent rules, and shown as
            facilitator recommendations.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            "Student activity",
            "Interaction data",
            "Support indicators",
            "Facilitator recommendation",
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-bold text-emerald-700">0{index + 1}</p>
              <p className="mt-3 font-semibold">{step}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/student"
            className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Start here
            </p>
            <h2 className="mt-3 text-2xl font-bold">Student literacy activity</h2>
            <p className="mt-3 leading-7 text-slate-700">
              Complete one reading task with answer selection, hint use, reread tracking,
              confidence rating, and submission.
            </p>
          </Link>

          <Link
            href="/facilitator"
            className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm transition hover:border-sky-500 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Review output
            </p>
            <h2 className="mt-3 text-2xl font-bold">Facilitator dashboard</h2>
            <p className="mt-3 leading-7 text-slate-700">
              View the class overview, student interaction evidence, support indicators,
              and the generated recommendation.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
