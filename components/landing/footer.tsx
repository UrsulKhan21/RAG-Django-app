import { Database } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <Database className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">RAG AI</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Powered by Django, Next.js, Qdrant Cloud, and LLaMA 3
        </p>
      </div>
    </footer>
  )
}
