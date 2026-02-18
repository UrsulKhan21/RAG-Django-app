"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

interface Source {
  id: number;
  source_type: "api" | "pdf";
  name: string;
  status: string;
  document_count: number;
}

const ROLE_TEMPLATES = [
  {
    label: "General Assistant",
    value:
      "You are a helpful assistant. Answer using only the indexed context. Be clear, concise, and provide bullet points when useful.",
  },
  {
    label: "Business Analyst",
    value:
      "You are a business analyst. Focus on KPIs, trends, and decisions. Highlight key numbers, compare changes, and end with actionable recommendations.",
  },
  {
    label: "Technical Support",
    value:
      "You are a technical support agent. Diagnose issues step-by-step, provide probable causes, and list practical troubleshooting actions in order.",
  },
  {
    label: "Compliance Reviewer",
    value:
      "You are a compliance reviewer. Identify policy-relevant facts, mention missing required information, and clearly separate confirmed facts from assumptions.",
  },
];

export default function AddSourcePage() {
  const [form, setForm] = useState({
    source_type: "api",
    name: "",
    agent_role: "",
    api_url: "",
    api_key: "",
    data_path: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const csrfToken = getCookie("csrftoken");

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      setListLoading(true);
      const data = await apiFetch("/api/sources/");
      setSources(data);
    } catch {
      setError("Could not load existing sources.");
    } finally {
      setListLoading(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      let source;

      if (form.source_type === "pdf") {
        if (!pdfFile) {
          throw new Error("PDF file is required.");
        }
        const body = new FormData();
        body.append("source_type", "pdf");
        body.append("name", form.name);
        body.append("agent_role", form.agent_role);
        body.append("pdf_file", pdfFile);

        source = await apiFetch("/api/sources/", {
          method: "POST",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
          body,
        });
      } else {
        source = await apiFetch("/api/sources/", {
          method: "POST",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
          body: JSON.stringify(form),
        });
      }

      await apiFetch(`/api/sources/${source.id}/ingest/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      });

      setMessage("Source created and ingestion started.");
      setForm({
        source_type: "api",
        name: "",
        agent_role: "",
        api_url: "",
        api_key: "",
        data_path: "",
      });
      setPdfFile(null);
      loadSources();
    } catch {
      setError("Failed to create source.");
    }

    setLoading(false);
  };

  async function deleteSource(id: number) {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      await apiFetch(`/api/sources/${id}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      });
      setSources((prev) => prev.filter((source) => source.id !== id));
    } catch {
      setError("Failed to delete source.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)]">
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
            Source Setup
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">
            Add New API Source
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Connect an API endpoint and start indexing documents for your AI agent.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, source_type: "api" }))
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    form.source_type === "api"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  API Source
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, source_type: "pdf" }))
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    form.source_type === "pdf"
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  PDF Source
                </button>
              </div>
            </div>

            <input
              name="name"
              placeholder="Source Name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
              required
            />

            <textarea
              name="agent_role"
              placeholder="AI Agent Role / Instructions (optional). If empty, default role will be used."
              value={form.agent_role}
              onChange={handleChange}
              className="min-h-[110px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
            />

            <div className="flex flex-col gap-2 md:flex-row">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
              >
                <option value="">Choose role template (optional)</option>
                {ROLE_TEMPLATES.map((template) => (
                  <option key={template.label} value={template.label}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedTemplate}
                onClick={() => {
                  const template = ROLE_TEMPLATES.find(
                    (item) => item.label === selectedTemplate
                  );
                  if (!template) return;
                  setForm((prev) => ({ ...prev, agent_role: template.value }));
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use Template
              </button>
            </div>

            {form.source_type === "api" ? (
              <>
                <input
                  name="api_url"
                  placeholder="API URL"
                  value={form.api_url}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                  required
                />

                <input
                  name="api_key"
                  placeholder="API Key (optional)"
                  value={form.api_key}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                />

                <input
                  name="data_path"
                  placeholder="Data Path (optional)"
                  value={form.data_path}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                />
              </>
            ) : (
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-100"
                required
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Processing..." : "Create Source"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)]">
          <h2 className="text-xl font-semibold text-slate-100">Your Sources</h2>
          <p className="mt-1 text-sm text-slate-300">
            Delete outdated sources or open one from the dashboard.
          </p>

          <div className="mt-5 space-y-3">
            {listLoading && (
              <p className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
                Loading...
              </p>
            )}

            {!listLoading && sources.length === 0 && (
              <p className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
                No sources added yet.
              </p>
            )}

            {sources.map((source) => (
              <article
                key={source.id}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-100">{source.name}</p>
                    <p className="mt-1 text-xs text-slate-300">
                      {source.source_type?.toUpperCase() || "API"} - {source.status} - {source.document_count} docs
                    </p>
                  </div>

                  <button
                    onClick={() => deleteSource(source.id)}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
