"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Trash2, Loader2, Crown, Check, X, Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { useWorkspace } from "@/app/workspace-provider"
import {
  getWorkspaceMembers, updateWorkspaceMemberRole,
  updateWorkspace, deleteWorkspace, type WorkspaceMember, type WorkspaceRole,
} from "@/lib/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const ROLE_COLORS: Record<string, string> = {
  owner:  "text-[#FFBF00] border-[#FFBF00]/30 bg-[#FFBF00]/10",
  admin:  "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  manager: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  member: "text-blue-400 border-blue-500/30 bg-blue-500/10",
}

const ICONS: { emoji: string; label: string }[] = [
  { emoji: "💼", label: "Sales" },
  { emoji: "�", label: "Marketing" },
  { emoji: "⚖️", label: "Legal" },
  { emoji: "⚙️", label: "Operations" },
  { emoji: "�", label: "Finance" },
  { emoji: "�", label: "HR" },
  { emoji: "�", label: "Management" },
  { emoji: "�", label: "General" },
  { emoji: "�", label: "Innovation" },
  { emoji: "�", label: "Strategy" },
  { emoji: "�", label: "Commerce" },
  { emoji: "🌍", label: "Global" },
]

export default function WorkspaceSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { workspaces, currentWorkspace, refreshWorkspaces, setCurrentWorkspace } = useWorkspace()

  const workspace = workspaces.find(w => w.id === id)
  const isOwner = workspace?.owner_id === user?.id

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("admin")
  const [inviting, setInviting] = useState(false)

  const [editDesc, setEditDesc] = useState(workspace?.description ?? "")
  const [savingDesc, setSavingDesc] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!id) return
    try {
      setMembersLoading(true)
      const m = await getWorkspaceMembers(id)
      setMembers(m)
    } catch {
    } finally {
      setMembersLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (workspace) {
      setEditDesc(workspace.description ?? "")
    }
  }, [workspace])

  const handleInvite = async () => {
    if (!user || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestingUserId: user.id, workspaceId: id, workspaceName: workspace?.name, email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to invite")
      toast({ title: "Member added", description: `${inviteEmail} added as ${inviteRole}.` })
      setInviteEmail("")
      await loadMembers()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" })
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!id || !user) return
    try {
      const res = await fetch("/api/workspace/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestingUserId: user.id,
          workspaceId: id,
          userId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove member")
      }
      setMembers(m => m.filter(x => x.user_id !== userId))
      toast({ title: "Member removed" })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" })
    }
  }

  const handleChangeRole = async (userId: string, role: WorkspaceRole) => {
    if (!id) return
    try {
      await updateWorkspaceMemberRole(id, userId, role)
      setMembers(m => m.map(x => x.user_id === userId ? { ...x, role } : x))
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" })
    }
  }

  const handleSaveDesc = async () => {
    if (!id) return
    setSavingDesc(true)
    try {
      await updateWorkspace(id, { description: editDesc.trim() || null })
      await refreshWorkspaces()
      toast({ title: "Saved" })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" })
    } finally {
      setSavingDesc(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteWorkspace(id)
      await refreshWorkspaces()
      toast({ title: "Workspace deleted" })
      router.push("/profile")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" })
    } finally {
      setDeleting(false)
    }
  }

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Workspace not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <Toaster />
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-3xl">{(workspace.icon ?? "🏢").split(",")[0].trim() || "🏢"}</span>
          <div>
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground">
              {(workspace.icon ?? "").split(",").map(s => s.trim()).filter(Boolean)
                .map(emoji => ICONS.find(ic => ic.emoji === emoji)?.label)
                .filter(Boolean)
                .join(" · ") || "Workspace settings"}
            </p>
          </div>
        </div>

        {/* Description (read-only display) */}
        {workspace.description && !isOwner && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{workspace.description}</p>
          </div>
        )}

        {/* Description */}
        {isOwner && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h2>
            </div>
            <div className="space-y-4">
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What does this workspace focus on?" />
              <Button onClick={handleSaveDesc} disabled={savingDesc}>
                {savingDesc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save description
              </Button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Members</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {members.length} {members.length === 1 ? "seat" : "seats"} · ${members.length * 50}/mo
            </span>
          </div>

          {/* Invite */}
          {isOwner && (
            <div className="mb-5 space-y-3 rounded-lg border border-white/5 bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invite by email</p>
              <div className="flex gap-2">
                <Input
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {(["admin", "manager", "member"] as WorkspaceRole[]).map(r => (
                    <button key={r} onClick={() => setInviteRole(r)}
                      className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                        inviteRole === r ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:border-white/20"
                      )}>
                      {r}
                    </button>
                  ))}
                </div>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm">
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Member list */}
          {membersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members...
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-background px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-xs font-bold text-emerald-400">
                    {m.role === "owner" ? <Crown className="h-4 w-4 text-[#FFBF00]" /> : m.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{m.user_id}</p>
                  </div>
                  {isOwner && m.role !== "owner" ? (
                    <div className="flex items-center gap-1.5">
                      {(["admin", "manager", "member"] as WorkspaceRole[]).map(r => (
                        <button key={r} onClick={() => handleChangeRole(m.user_id, r)}
                          className={cn("rounded px-2 py-0.5 text-xs font-medium transition-colors capitalize",
                            m.role === r ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-white"
                          )}>
                          {r}
                        </button>
                      ))}
                      <button onClick={() => handleRemoveMember(m.user_id)}
                        className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", ROLE_COLORS[m.role] ?? "")}>
                      {m.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        {isOwner && workspaces.length > 1 && (
          <div className="rounded-xl border border-red-500/20 bg-card p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-red-400 uppercase tracking-wide">Danger Zone</h2>
            <p className="mb-4 text-xs text-muted-foreground">Deleting this workspace is permanent. All documents, chats, and categories in this workspace will be removed.</p>

            {!confirmDelete ? (
              <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete workspace
              </Button>
            ) : (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-sm font-medium text-red-300">
                  Delete <span className="font-bold">&ldquo;{workspace.name}&rdquo;</span>? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}
                    className="flex-1">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleDelete} disabled={deleting}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 border-0">
                    {deleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                    Yes, delete it
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
