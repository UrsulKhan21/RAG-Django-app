"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
}

interface Source {
  id: number;
  name: string;
  status: string;
  document_count: number;
}

export default function ChatPage() {
  const params = useParams();
  const sourceId = params.sourceId as string;

  const [sources, setSources] = useState<Source[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    async function initializeChat() {
      try {
        setPageLoading(true);

        const fetchedSources = await apiFetch("/api/sources/");
        setSources(fetchedSources);

        const sessions = await apiFetch(`/api/chat/sessions/?source=${sourceId}`);

        let activeSession;

        if (sessions.length > 0) {
          activeSession = sessions[0];
        } else {
          activeSession = await apiFetch("/api/chat/sessions/", {
            method: "POST",
            body: JSON.stringify({ api_source: sourceId }),
          });
        }

        setSessionId(activeSession.id);

        const previousMessages = await apiFetch(
          `/api/chat/sessions/${activeSession.id}/messages/`
        );

        setMessages(previousMessages);
      } catch (err) {
        console.error("Failed to initialize chat:", err);
      } finally {
        setPageLoading(false);
      }
    }

    if (sourceId) {
      initializeChat();
    }
  }, [sourceId]);

  const activeSource = useMemo(
    () => sources.find((source) => String(source.id) === sourceId),
    [sourceId, sources]
  );

  const sendMessage = async () => {
    if (!sessionId || !question.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await apiFetch(`/api/chat/sessions/${sessionId}/query/`, {
        method: "POST",
        body: JSON.stringify({ question }),
      });

      setMessages((prev) => [...prev, res]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 md:gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)] md:p-5 lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
              Sources
            </p>
            <a
              href="/dashboard"
              className="text-xs font-medium text-slate-300 hover:text-sky-300"
            >
              Dashboard
            </a>
          </div>

          <div className="mt-4 space-y-2 overflow-y-auto lg:max-h-[calc(100vh-11rem)]">
            {sources.map((source) => {
              const isActive = String(source.id) === sourceId;
              return (
                <a
                  key={source.id}
                  href={`/chat/${source.id}`}
                  className={`block rounded-xl border px-3 py-2.5 transition ${
                    isActive
                      ? "border-sky-500/60 bg-sky-500/15"
                      : "border-slate-700 bg-slate-950 hover:border-slate-500"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{source.name}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {source.status} - {source.document_count} docs
                  </p>
                </a>
              );
            })}

            {sources.length === 0 && (
              <p className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
                No sources found.
              </p>
            )}
          </div>
        </aside>

        <section className="flex h-[calc(100vh-2rem)] min-h-[640px] flex-col rounded-2xl border border-slate-800 bg-slate-900/85 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)] md:h-[calc(100vh-3rem)]">
          <header className="border-b border-slate-800 px-5 py-4 md:px-6">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
              AI Knowledge Chat
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">
              {activeSource ? activeSource.name : "Conversation"}
            </h1>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-950/60 px-5 py-5 md:px-6">
            {pageLoading && (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
                Loading chat...
              </div>
            )}

            {!pageLoading && messages.length === 0 && (
              <div className="animate-float-up relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm md:p-6">
                <div className="animate-soft-pulse absolute -right-16 -top-20 h-44 w-44 rounded-full bg-sky-500/20 blur-2xl" />
                <div className="animate-soft-pulse absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-cyan-500/20 blur-2xl [animation-delay:240ms]" />

                <div className="relative">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
                    Welcome
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100 md:text-3xl">
                    AI Knowledge Chat
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
                    This project is an API-powered RAG workspace where you manage data sources, ingest docs, and chat with an AI assistant using source-specific sessions.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      "Next.js 16",
                      "React 19",
                      "TypeScript",
                      "Tailwind CSS",
                      "RAG Sessions",
                      "Source Ingestion API",
                    ].map((tool) => (
                      <span
                        key={tool}
                        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-200"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 text-sm">
                    <a
                      href="https://github.com/UrsulKhan21"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
                    >
                      GitHub: UrsulKhan21
                    </a>
                    <a
                      href="https://www.linkedin.com/in/abdur-ursul-khan-0325522a9/"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
                    >
                      LinkedIn: Abdur Ursul Khan
                    </a>
                    <a
                      href="https://www.instagram.com/ursulkhan21/"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
                    >
                      Instagram: ursulkhan21
                    </a>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-sky-500 text-white"
                      : "border border-slate-700 bg-slate-900 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
                  <span className="text-sm text-slate-300">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 md:px-6">
            <div className="flex gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this source..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                disabled={loading || pageLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />

              <button
                onClick={sendMessage}
                disabled={loading || pageLoading || !question.trim()}
                className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
