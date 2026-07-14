"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/app/auth-provider"
import { getWorkspacesForUser, createWorkspace, backfillWorkspaceId, type Workspace } from "@/lib/workspace"

type WorkspaceContextType = {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  workspaceLoading: boolean
  setCurrentWorkspace: (w: Workspace) => void
  refreshWorkspaces: () => Promise<void>
  createAndSelectWorkspace: (name: string, description?: string, icon?: string) => Promise<Workspace>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  workspaceLoading: true,
  setCurrentWorkspace: () => {},
  refreshWorkspaces: async () => {},
  createAndSelectWorkspace: async () => { throw new Error("Not initialized") },
})

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)

  const loadWorkspaces = useCallback(async (userId: string) => {
    try {
      let list = await getWorkspacesForUser(userId)

      // First-time user: auto-create Default workspace and migrate all legacy data into it
      if (list.length === 0) {
        const defaultWs = await createWorkspace(userId, "Default", "Your initial workspace", "🏢")
        await backfillWorkspaceId(userId, defaultWs.id)
        list = [defaultWs]
      } else {
        // For returning users who already have workspaces, silently backfill any remaining NULL records
        // into their first (oldest) workspace so nothing is orphaned
        const first = list.reduce((a, b) => a.created_at < b.created_at ? a : b)
        await backfillWorkspaceId(userId, first.id)
      }

      setWorkspaces(list)

      // Restore last selected workspace from localStorage
      const savedId = localStorage.getItem(`exploro_workspace_${userId}`)
      const saved = list.find(w => w.id === savedId)
      setCurrentWorkspaceState(saved ?? list[0] ?? null)
    } catch (err) {
      console.error("[WorkspaceProvider] Failed to load workspaces:", err)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setWorkspaces([])
      setCurrentWorkspaceState(null)
      setWorkspaceLoading(false)
      return
    }
    loadWorkspaces(user.id)
  }, [user, authLoading, loadWorkspaces])

  const setCurrentWorkspace = useCallback((w: Workspace) => {
    setCurrentWorkspaceState(w)
    if (user) localStorage.setItem(`exploro_workspace_${user.id}`, w.id)
  }, [user])

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return
    await loadWorkspaces(user.id)
  }, [user, loadWorkspaces])

  const createAndSelectWorkspace = useCallback(async (
    name: string,
    description?: string,
    icon?: string
  ): Promise<Workspace> => {
    if (!user) throw new Error("Not authenticated")
    const ws = await createWorkspace(user.id, name, description, icon)
    await refreshWorkspaces()
    setCurrentWorkspace(ws)
    return ws
  }, [user, refreshWorkspaces, setCurrentWorkspace])

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      workspaceLoading,
      setCurrentWorkspace,
      refreshWorkspaces,
      createAndSelectWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
