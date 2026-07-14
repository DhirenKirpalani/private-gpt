"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase, getUser, getSession, signOut, getProfile, type Profile } from "@/lib/supabase"
import { getSubscription, startTrial, type Subscription } from "@/lib/subscription"
import type { User, Session } from "@supabase/supabase-js"
import { PageLoadingScreen } from "@/components/ui/skeleton"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  logout: () => Promise<void>
  avatarUrl: string
  profile: Profile | null
  role: Profile["role"]
  refreshProfile: () => Promise<void>
  subscription: Subscription | null
  refreshSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
  avatarUrl: "",
  profile: null,
  role: null,
  refreshProfile: async () => {},
  subscription: null,
  refreshSubscription: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Profile["role"]>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
      setRole(p?.role || null)
      const url = p?.avatar_url || ""
      setAvatarUrl(url)
      if (url) localStorage.setItem("exploro_avatar_url", url)
      else localStorage.removeItem("exploro_avatar_url")
    } catch {
      // ignore — avatar stays empty
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [user, loadProfile])

  const loadSubscription = useCallback(async (userId: string) => {
    try {
      const sub = await getSubscription(userId)
      if (!sub) {
        // Existing user without a subscription row — grant a 15-day trial.
        await startTrial(userId)
        const newSub = await getSubscription(userId)
        setSubscription(newSub)
        return
      }
      setSubscription(sub)
    } catch {
      setSubscription(null)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (!user) return
    await loadSubscription(user.id)
  }, [user, loadSubscription])

  // Pre-populate avatarUrl from cache so children don't flash before async load
  useEffect(() => {
    const cached = localStorage.getItem("exploro_avatar_url")
    if (cached) setAvatarUrl(cached)
  }, [])

  useEffect(() => {
    async function initAuth() {
      try {
        const currentSession = await getSession()
        setSession(currentSession)
        if (currentSession) {
          const currentUser = await getUser()
          setUser(currentUser)
          if (currentUser) {
            await loadProfile(currentUser.id)
            await loadSubscription(currentUser.id)
          }
        }
      } catch {
        // No session = not logged in
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      const newUser = newSession?.user ?? null
      setUser(newUser)
      if (newUser) {
        await loadProfile(newUser.id)
        await loadSubscription(newUser.id)
      } else {
        setProfile(null)
        setAvatarUrl("")
        setSubscription(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadProfile, loadSubscription])

  const logout = async () => {
    await signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setRole(null)
    setAvatarUrl("")
    setSubscription(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, logout, avatarUrl, profile, role, refreshProfile, subscription, refreshSubscription }}>
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
    return <PageLoadingScreen />
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return null
  }

  return <>{children}</>
}
