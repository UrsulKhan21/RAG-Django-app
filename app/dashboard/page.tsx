"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiSources, type ApiSource } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Globe, MessageSquare, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function DashboardOverview() {
  const { user } = useAuth()
  const [sources, setSources] = useState<ApiSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const data = await apiSources.list()
      setSources(data)
    } catch (e: any) {
      setError(e.message || "Failed to load sources")
    } finally {
      setLoading(false)
    }
  }

  const readySources = sources.filter((s) => s.status === "ready")
  const totalDocs = sources.reduce((sum, s) => sum + s.document_count, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your API sources and chat with your data
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Sources
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{sources.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {readySources.length} ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents Indexed
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDocs}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vector DB
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Qdrant</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cloud connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sources */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent API Sources</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/sources">
              View all
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Globe className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">No sources yet</p>
                <p className="text-xs text-muted-foreground">
                  Add your first API source to get started
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/dashboard/sources">Add Source</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sources.slice(0, 5).map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.document_count} documents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {source.status === "ready" && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </span>
                    )}
                    {source.status === "pending" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                    {source.status === "ingesting" && (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-warning border-t-transparent" />
                        Ingesting
                      </span>
                    )}
                    {source.status === "error" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Error
                      </span>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/chat?source=${source.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Chat with {source.name}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
