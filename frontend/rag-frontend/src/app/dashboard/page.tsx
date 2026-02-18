"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Source {
  id: number;
  name: string;
  status: string;
  document_count: number;
}

export default function Dashboard() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/sources/")
      .then((data) => setSources(data))
      .catch(() => {
        window.location.href = "/login";
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const readySources = sources.filter((source) => source.status === "ready");
  const totalDocuments = sources.reduce(
    (sum, source) => sum + source.document_count,
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
                Agent Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-100 md:text-4xl">
                Source Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-300 md:text-base">
                Manage your indexed APIs and jump straight into AI chat.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/add-source"
                className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Add Source
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Total Sources
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {sources.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Ready Sources
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {readySources.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Indexed Docs
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {totalDocuments}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
              Loading sources...
            </div>
          )}

          {!loading && sources.length === 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
              No sources found. Add one to start chatting with your agent.
            </div>
          )}

          {sources.map((source) => (
            <article
              key={source.id}
              className="group rounded-2xl border border-slate-700 bg-slate-900/75 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    {source.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
                    <p>
                      Status:{" "}
                      <span className="font-medium text-slate-100">
                        {source.status}
                      </span>
                    </p>
                    <p>
                      Documents:{" "}
                      <span className="font-medium text-slate-100">
                        {source.document_count}
                      </span>
                    </p>
                  </div>
                </div>
                <a
                  href={`/chat/${source.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
                >
                  Open Chat
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
