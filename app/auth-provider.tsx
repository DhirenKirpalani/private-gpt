"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase, getUser, getSession, onAuthStateChange, signOut } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      try {
        const currentSession = await getSession()
        setSession(currentSession)
        if (currentSession) {
          const currentUser = await getUser()
          setUser(currentUser)
        }
      } catch {
        // No session = not logged in
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return null
  }

  return <>{children}</>
}
