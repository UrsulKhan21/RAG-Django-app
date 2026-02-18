"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/user/")
      .then(() => {
        window.location.href = "/dashboard";
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/login/`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        await apiFetch("/api/auth/register/", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        });
      } else {
        await apiFetch("/api/auth/login/", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });
      }

      window.location.href = "/dashboard";
    } catch {
      setError(
        mode === "signup"
          ? "Unable to create account. Please check your details."
          : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-8">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)] backdrop-blur md:p-8">
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
            Welcome Back
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">
            Access AI Knowledge Chat
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Login with Google or use email and password. Your session is remembered with secure auth cookies.
          </p>

          <div className="mt-6 flex rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
              required
            />

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create Account"
                  : "Login"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
            <div className="h-px flex-1 bg-slate-700" />
            <span>or</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
          >
            Continue with Google
          </button>
        </section>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_14px_40px_-20px_rgba(2,6,23,0.9)] md:p-8">
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
            Account Storage
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">
            Persistent Login
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            User accounts are stored in the default Django SQLite database (`db.sqlite3`). Auth uses httpOnly cookies with token refresh to keep users logged in.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              Email/password account creation
            </li>
            <li className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              Google OAuth supported
            </li>
            <li className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              Auto session restore on API calls
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
