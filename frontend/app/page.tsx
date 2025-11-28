export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <main className="w-full max-w-3xl border border-neutral-800 rounded-2xl bg-neutral-950/80 p-8 shadow-xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            ORICALO
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Urdu Real-Estate Voice Agent – Console
          </h1>
          <p className="text-sm text-neutral-400 max-w-xl">
            This Next.js app provides a live console for the Iteration 1 Urdu
            ASR/STT system. Start the FastAPI backend, then open the console to
            stream microphone audio and view transcripts in real time.
          </p>
        </header>

        <section className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Quick Start
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-neutral-300">
            <li>Run the backend: <code className="bg-neutral-900 px-1 rounded">uvicorn app.main:app --reload</code> in the <code>backend/</code> folder.</li>
            <li>Ensure it is listening on <code>http://localhost:8000</code>.</li>
            <li>Open the console UI using the button below.</li>
          </ol>
        </section>

        <section className="flex flex-wrap gap-4 pt-2">
          <a
            href="/console"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/60 px-4 py-2 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
          >
            Open Live Console
          </a>
          <a
            href="https://github.com/abdulrafayoc/oricalo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900 transition-colors"
          >
            View Repository
          </a>
        </section>
      </main>
    </div>
  );
}
