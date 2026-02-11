"use client"

import { useState } from "react"
import { apiRequest } from "@/lib/api"

export default function AddSourcePage() {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !url) {
      alert("Name and URL are required")
      return
    }

    setLoading(true)

    try {
      await apiRequest("/api/sources/", {
        method: "POST",
        body: JSON.stringify({
          name,
          api_url: url,
          api_key: apiKey || null,
        }),
      })

      alert("Source added successfully!")

      setName("")
      setUrl("")
      setApiKey("")
    } catch (error: any) {
      alert(error.message || "Failed to add source")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-8 py-12">
      
      <h1 className="text-3xl font-semibold mb-10">
        Add API Source
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-6"
      >
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Source Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm"
            placeholder="e.g. Products API"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            API URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm"
            placeholder="https://api.example.com/data"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            API Key (Optional)
          </label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm"
            placeholder="Bearer token..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          {loading ? "Adding..." : "Add Source"}
        </button>
      </form>
    </div>
  )
}
