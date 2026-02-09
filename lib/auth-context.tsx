"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: string
  email: string
  name: string
  picture: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  backendUrl: string
  setBackendUrl: (url: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const BACKEND_URL_KEY = "rag_backend_url"
const DEFAULT_BACKEND = "http://localhost:8000"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [backendUrl, setBackendUrlState] = useState(DEFAULT_BACKEND)

  useEffect(() => {
    const stored = localStorage.getItem(BACKEND_URL_KEY)
    if (stored) setBackendUrlState(stored)
  }, [])

  const setBackendUrl = useCallback((url: string) => {
    setBackendUrlState(url)
    localStorage.setItem(BACKEND_URL_KEY, url)
  }, [])

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [backendUrl])

  const checkAuth = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/user/`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = () => {
    window.location.href = `${backendUrl}/api/auth/google/login/`
  }

  const logout = async () => {
    try {
      await fetch(`${backendUrl}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // ignore
    }
    setUser(null)
    window.location.href = "/"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        backendUrl,
        setBackendUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
