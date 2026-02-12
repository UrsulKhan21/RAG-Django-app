"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function Dashboard() {
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/sources/")
      .then(setSources)
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Your Sources</h1>

      <a
        href="/add-source"
        className="bg-black text-white px-4 py-2 rounded mb-6 inline-block"
      >
        Add Source
      </a>

      <div className="space-y-4">
        {sources.map((source) => (
          <div
            key={source.id}
            className="border p-4 rounded flex justify-between"
          >
            <div>
              <h2 className="font-semibold">{source.name}</h2>
              <p className="text-sm text-gray-500">
                Status: {source.status}
              </p>
              <p className="text-sm">
                Documents: {source.document_count}
              </p>
            </div>

            <a
              href={`/chat/${source.id}`}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Chat
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
