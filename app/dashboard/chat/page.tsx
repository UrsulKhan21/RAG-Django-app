"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  apiSources,
  chatApi,
  type ApiSource,
  type ChatSession,
  type ChatMessage,
} from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Globe,
  Bot,
  User,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function ChatPageContent() {
  const searchParams = useSearchParams()
  const initialSourceId = searchParams.get("source")

  const [sources, setSources] = useState<ApiSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId || "")
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingSources, setLoadingSources] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load sources on mount
  useEffect(() => {
    loadSources()
  }, [])

  // Load sessions when source changes
  useEffect(() => {
    if (selectedSourceId) {
      loadSessions(Number(selectedSourceId))
    } else {
      setSessions([])
      setActiveSession(null)
      setMessages([])
    }
  }, [selectedSourceId])

  // Load messages when session changes
  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id)
    } else {
      setMessages([])
    }
  }, [activeSession])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadSources = async () => {
    try {
      const data = await apiSources.list()
      setSources(data.filter((s) => s.status === "ready"))
    } catch {
      toast.error("Failed to load sources")
    } finally {
      setLoadingSources(false)
    }
  }

  const loadSessions = async (sourceId: number) => {
    setLoadingSessions(true)
    try {
      const data = await chatApi.sessions(sourceId)
      setSessions(data)
      if (data.length > 0) {
        setActiveSession(data[0])
      } else {
        setActiveSession(null)
      }
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadMessages = async (sessionId: number) => {
    setLoadingMessages(true)
    try {
      const data = await chatApi.messages(sessionId)
      setMessages(data)
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const createSession = async () => {
    if (!selectedSourceId) {
      toast.error("Select an API source first")
      return
    }
    try {
      const session = await chatApi.createSession(Number(selectedSourceId), "New Chat")
      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setMessages([])
    } catch (e: any) {
      toast.error(e.message || "Failed to create chat session")
    }
  }

  const deleteSession = async (id: number) => {
    try {
      await chatApi.deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSession?.id === id) {
        const remaining = sessions.filter((s) => s.id !== id)
        setActiveSession(remaining.length > 0 ? remaining[0] : null)
      }
    } catch {
      toast.error("Failed to delete session")
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return

    const question = input.trim()
    setInput("")
    setSending(true)

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      role: "user",
      content: question,
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await chatApi.sendMessage(activeSession.id, question)
      setMessages((prev) => [...prev, response])

      // Refresh sessions to get updated title
      if (messages.length === 0) {
        loadSessions(Number(selectedSourceId))
      }
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${e.message || "Failed to get response"}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setSending(false)
    }
  }

  const selectedSource = sources.find((s) => s.id === Number(selectedSourceId))

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Source Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select an API source" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.id} value={String(source.id)}>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  {source.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSourceId && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={createSession}>
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        )}

        {selectedSource && (
          <span className="text-xs text-muted-foreground">
            {selectedSource.document_count} documents indexed
          </span>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Session list */}
        {selectedSourceId && sessions.length > 0 && (
          <div className="flex w-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Sessions</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                  activeSession?.id === session.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                )}
                onClick={() => setActiveSession(session)}
              >
                <span className="truncate">{session.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(session.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Chat messages */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          {!selectedSourceId ? (
            <EmptyState
              icon={Globe}
              title="Select an API source"
              description="Choose a source from the dropdown above to start chatting"
            />
          ) : !activeSession ? (
            <EmptyState
              icon={MessageSquare}
              title="Start a conversation"
              description="Create a new chat session to ask questions about your data"
              action={
                <Button size="sm" className="gap-1.5" onClick={createSession}>
                  <Plus className="h-3.5 w-3.5" />
                  New Chat
                </Button>
              }
            />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Bot className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Ask a question about {selectedSource?.name || "your data"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((msg, i) => (
                      <div
                        key={msg.id || i}
                        className={cn(
                          "flex gap-3",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 border-t border-border/30 pt-2">
                              <p className="text-xs opacity-70">
                                Sources: {msg.sources.join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                        {msg.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {sending && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-xl bg-secondary px-4 py-2.5">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.1s]" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your data..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !input.trim()} size="icon">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
