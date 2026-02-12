"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AddSourcePage() {
  const [form, setForm] = useState({
    name: "",
    api_url: "",
    api_key: "",
    data_path: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // 1️⃣ Create source
      const source = await apiFetch("/api/sources/", {
        method: "POST",
        body: JSON.stringify(form),
      });

      // 2️⃣ Trigger ingestion
      await apiFetch(`/api/sources/${source.id}/ingest/`, {
        method: "POST",
      });

      setMessage("Source created and ingestion started.");
      setForm({ name: "", api_url: "", api_key: "", data_path: "" });
    } catch (err) {
      setMessage("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add API Source</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          placeholder="Source Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="api_url"
          placeholder="API URL"
          value={form.api_url}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="api_key"
          placeholder="API Key (optional)"
          value={form.api_key}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          name="data_path"
          placeholder="Data Path (optional)"
          value={form.data_path}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "Processing..." : "Add Source"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-gray-700">
          {message}
        </p>
      )}
    </main>
  );
}
