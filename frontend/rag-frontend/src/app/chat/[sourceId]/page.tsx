"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ChatPage() {
  const params = useParams();
  const sourceId = params.sourceId as string;

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState("");

  // Create session on load
  useEffect(() => {
    apiFetch("/api/chat/sessions/", {
      method: "POST",
      body: JSON.stringify({ api_source: sourceId }),
    }).then((session) => {
      setSessionId(session.id);
    });
  }, [sourceId]);

  const sendMessage = async () => {
    if (!sessionId || !question) return;

    const res = await apiFetch(
      `/api/chat/sessions/${sessionId}/query/`,
      {
        method: "POST",
        body: JSON.stringify({ question }),
      }
    );

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      res,
    ]);

    setQuestion("");
  };

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Chat
      </h1>

      <div className="border rounded p-4 h-96 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div key={index} className="mb-3">
            <strong>{msg.role}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
