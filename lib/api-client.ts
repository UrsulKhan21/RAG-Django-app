const BACKEND_URL_KEY = "rag_backend_url"
const DEFAULT_BACKEND = "http://localhost:8000"

function getBackendUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BACKEND
  return localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const backendUrl = getBackendUrl()
  const url = `${backendUrl}${endpoint}`

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.error || `Request failed: ${res.status}`)
  }

  return res.json()
}

export interface ApiSource {
  id: number
  name: string
  api_url: string
  api_key: string
  headers: Record<string, string>
  data_path: string
  status: "pending" | "ingesting" | "ready" | "error"
  document_count: number
  last_synced: string | null
  created_at: string
}

export interface ChatMessage {
  id?: number
  role: "user" | "assistant"
  content: string
  sources?: string[]
  created_at?: string
}

export interface ChatSession {
  id: number
  title: string
  api_source: number
  api_source_name: string
  created_at: string
  updated_at: string
}

// API Source endpoints
export const apiSources = {
  list: () => apiRequest<ApiSource[]>("/api/sources/"),
  create: (data: Partial<ApiSource>) =>
    apiRequest<ApiSource>("/api/sources/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest(`/api/sources/${id}/`, { method: "DELETE" }),
  ingest: (id: number) =>
    apiRequest<{ status: string }>(`/api/sources/${id}/ingest/`, {
      method: "POST",
    }),
  sync: (id: number) =>
    apiRequest<{ status: string }>(`/api/sources/${id}/sync/`, {
      method: "POST",
    }),
}

// Chat endpoints
export const chatApi = {
  sessions: (sourceId: number) =>
    apiRequest<ChatSession[]>(`/api/chat/sessions/?source=${sourceId}`),
  createSession: (sourceId: number, title: string) =>
    apiRequest<ChatSession>("/api/chat/sessions/", {
      method: "POST",
      body: JSON.stringify({ api_source: sourceId, title }),
    }),
  messages: (sessionId: number) =>
    apiRequest<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages/`),
  sendMessage: (sessionId: number, content: string, topK: number = 5) =>
    apiRequest<ChatMessage>(`/api/chat/sessions/${sessionId}/query/`, {
      method: "POST",
      body: JSON.stringify({ question: content, top_k: topK }),
    }),
  deleteSession: (sessionId: number) =>
    apiRequest(`/api/chat/sessions/${sessionId}/`, { method: "DELETE" }),
}
