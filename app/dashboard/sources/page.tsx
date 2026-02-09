"use client"

import { useEffect, useState } from "react"
import { apiSources, type ApiSource } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function SourcesPage() {
  const [sources, setSources] = useState<ApiSource[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [dataPath, setDataPath] = useState("")

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const data = await apiSources.list()
      setSources(data)
    } catch {
      toast.error("Failed to load sources. Is the Django backend running?")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || !apiUrl.trim()) {
      toast.error("Name and API URL are required")
      return
    }

    setCreating(true)
    try {
      await apiSources.create({
        name: name.trim(),
        api_url: apiUrl.trim(),
        api_key: apiKey.trim(),
        data_path: dataPath.trim(),
      })
      toast.success("API source created")
      setDialogOpen(false)
      resetForm()
      loadSources()
    } catch (e: any) {
      toast.error(e.message || "Failed to create source")
    } finally {
      setCreating(false)
    }
  }

  const handleIngest = async (id: number) => {
    try {
      toast.info("Starting data ingestion...")
      await apiSources.ingest(id)
      toast.success("Data ingested successfully")
      loadSources()
    } catch (e: any) {
      toast.error(e.message || "Ingestion failed")
      loadSources()
    }
  }

  const handleSync = async (id: number) => {
    try {
      toast.info("Re-syncing data...")
      await apiSources.sync(id)
      toast.success("Data synced successfully")
      loadSources()
    } catch (e: any) {
      toast.error(e.message || "Sync failed")
      loadSources()
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiSources.delete(id)
      toast.success("Source deleted")
      loadSources()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete source")
    }
  }

  const resetForm = () => {
    setName("")
    setApiUrl("")
    setApiKey("")
    setDataPath("")
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      ready: { icon: CheckCircle2, label: "Ready", className: "text-success bg-success/10" },
      pending: { icon: Clock, label: "Pending", className: "text-muted-foreground bg-muted" },
      ingesting: { icon: RefreshCw, label: "Ingesting", className: "text-warning bg-warning/10" },
      error: { icon: AlertCircle, label: "Error", className: "text-destructive bg-destructive/10" },
    }[status] || { icon: Clock, label: status, className: "text-muted-foreground bg-muted" }

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        <Icon className={`h-3 w-3 ${status === "ingesting" ? "animate-spin" : ""}`} />
        {config.label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect REST APIs to create knowledge bases for your AI chatbot
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add API Source</DialogTitle>
              <DialogDescription>
                Connect a REST API to ingest its data into your knowledge base
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="source-name">Name</Label>
                <Input
                  id="source-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Product Catalog API"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/products"
                />
                <p className="text-xs text-muted-foreground">
                  The full URL to a GET endpoint that returns JSON data
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="api-key">API Key (optional)</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer token or API key"
                />
                <p className="text-xs text-muted-foreground">
                  Will be sent as Authorization: Bearer header
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="data-path">Data Path (optional)</Label>
                <Input
                  id="data-path"
                  value={dataPath}
                  onChange={(e) => setDataPath(e.target.value)}
                  placeholder="e.g. products or data.items"
                />
                <p className="text-xs text-muted-foreground">
                  Dot-separated path to the array of items in the JSON response
                </p>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="mt-2">
                {creating ? "Creating..." : "Create Source"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Globe className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium text-foreground">No API sources yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first API source to start building your knowledge base
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{source.name}</h3>
                      <StatusBadge status={source.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {source.api_url.length > 50
                          ? source.api_url.slice(0, 50) + "..."
                          : source.api_url}
                      </span>
                      <span>{source.document_count} documents</span>
                      {source.last_synced && (
                        <span>
                          Synced {new Date(source.last_synced).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {source.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleIngest(source.id)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Ingest
                    </Button>
                  )}
                  {source.status === "ready" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleSync(source.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link href={`/dashboard/chat?source=${source.id}`}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </Link>
                      </Button>
                    </>
                  )}
                  {source.status === "error" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleIngest(source.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {source.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete source?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{source.name}&quot; and all its indexed data from Qdrant.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(source.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
