"use client"

import { useState } from "react"

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")

  const sendMessage = () => {
    if (!input.trim()) return

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "assistant", content: "This will connect to backend soon." },
    ])

    setInput("")
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 text-lg font-semibold">
        Chat with Your Data
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-20">
            Ask something about your API data.
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[60%] px-5 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-white text-black"
                  : "bg-white/10"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-8 py-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-white text-black px-5 py-2 rounded-xl text-sm"
        >
          Send
        </button>
      </div>
    </div>
  )
}
