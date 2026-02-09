"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Database, MessageSquare, Zap } from "lucide-react"
import { BackendConfig } from "@/components/backend-config"

export function LandingHero() {
  const { login, isLoading } = useAuth()

  return (
    <section className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-24">
        {/* Nav */}
        <nav className="mb-16 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">RAG AI</span>
          </div>
          <div className="flex items-center gap-3">
            <BackendConfig />
            <Button onClick={login} disabled={isLoading} variant="outline" size="sm">
              Sign in with Google
            </Button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Powered by Qdrant Cloud + LLaMA 3
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Turn any API into an
            <span className="text-primary"> intelligent knowledge base</span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Connect your REST APIs, automatically embed the data into a vector database,
            and ask natural language questions. Get accurate, context-aware answers powered by RAG.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button onClick={login} disabled={isLoading} size="lg" className="gap-2 px-8">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Get Started with Google
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <a href="https://github.com/UrsulKhan21/rag_ai_webx" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid w-full max-w-2xl grid-cols-3 gap-8">
          {[
            { icon: Database, label: "Vector Storage", value: "Qdrant Cloud" },
            { icon: MessageSquare, label: "AI Model", value: "LLaMA 3.3" },
            { icon: Zap, label: "Embeddings", value: "MiniLM-L6" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
