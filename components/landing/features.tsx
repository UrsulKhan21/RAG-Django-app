import { Globe, Lock, RefreshCw, Search } from "lucide-react"

const features = [
  {
    icon: Globe,
    title: "Connect Any REST API",
    description:
      "Provide any API URL and optional API key. The system fetches, normalizes, and indexes the data automatically.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description:
      "Your data is embedded using SentenceTransformers and stored in Qdrant Cloud for fast semantic retrieval.",
  },
  {
    icon: RefreshCw,
    title: "Auto-Sync",
    description:
      "Keep your knowledge base fresh with automatic periodic re-ingestion from your API sources.",
  },
  {
    icon: Lock,
    title: "Google Authentication",
    description:
      "Secure sign-in with Google OAuth. Each user's API sources and chat sessions are private.",
  },
]

export function LandingFeatures() {
  return (
    <section className="border-t border-border bg-secondary/30 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to an AI-powered knowledge base from your API data
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            { step: "1", title: "Add API Source", desc: "Enter your API URL, optional key, and headers" },
            { step: "2", title: "Ingest Data", desc: "We fetch, embed, and store in Qdrant Cloud" },
            { step: "3", title: "Ask Questions", desc: "Chat with AI that answers from your data" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {s.step}
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
