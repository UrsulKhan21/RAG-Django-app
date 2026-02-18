export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="min-h-screen w-full">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <a href="/" className="text-xl font-semibold tracking-tight">
            AI<span className="text-sky-400">Knowledge</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="/" className="text-sky-400">Home</a>
            <a href="#about" className="hover:text-white">About</a>
            <a href="#tools" className="hover:text-white">Tools</a>
            <a href="#connect" className="hover:text-white">Connect</a>
          </nav>
          <a
            href="/login"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
          >
            Sign up
          </a>
        </header>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-8 pt-4 md:px-8 md:pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-float-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              AI Project Intro
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              AI Knowledge Chat
              <span className="block bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                for your next AI workflow.
              </span>
            </h1>
            <p id="about" className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
              A modern API-based RAG assistant where you add sources, ingest
              documents, and run source-aware conversations through dedicated
              chat sessions.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/login"
                className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Get Started
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
              >
                Open Dashboard
              </a>
            </div>
          </div>

          <div className="animate-float-up relative h-[320px] rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_82%_72%,rgba(16,185,129,0.25),transparent_45%),linear-gradient(130deg,#0b1020_0%,#111827_100%)] [animation-delay:120ms] md:h-[420px]">
            <div className="animate-soft-pulse absolute left-[15%] top-[18%] h-28 w-28 rounded-full bg-sky-400/30 blur-xl" />
            <div className="animate-soft-pulse absolute bottom-[12%] right-[12%] h-36 w-36 rounded-full bg-emerald-400/25 blur-xl [animation-delay:220ms]" />
            <div className="cube-scene absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="cube">
                <div className="cube-face cube-face-front">AIKnowledge</div>
                <div className="cube-face cube-face-back">AIKnowledge</div>
                <div className="cube-face cube-face-right">AIKnowledge</div>
                <div className="cube-face cube-face-left">AIKnowledge</div>
                <div className="cube-face cube-face-top">AIKnowledge</div>
                <div className="cube-face cube-face-bottom">AIKnowledge</div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-6 md:px-8 md:py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div id="tools">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
              Tools Used
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Next.js 16",
                "React 19",
                "TypeScript",
                "Tailwind CSS",
                "RAG Retrieval Flow",
                "Session-based Chat API",
              ].map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div id="connect">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
              Connect
            </p>
            <div className="mt-3 grid gap-2">
              <a
                href="https://github.com/UrsulKhan21"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
              >
                GitHub - UrsulKhan21
              </a>
              <a
                href="https://www.linkedin.com/in/abdur-ursul-khan-0325522a9/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
              >
                LinkedIn - Abdur Ursul Khan
              </a>
              <a
                href="https://www.instagram.com/ursulkhan21/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
              >
                Instagram - ursulkhan21
              </a>
            </div>
          </div>
          </div>
        </section>
      </div>
    </main>
  );
}
