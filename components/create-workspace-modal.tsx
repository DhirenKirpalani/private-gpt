"use client"

import { useState } from "react"
import { X, Loader2, Check, Plus, Trash2, UserPlus } from "lucide-react"
import { useWorkspace } from "@/app/workspace-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ICONS: { emoji: string; label: string }[] = [
  { emoji: "🤝", label: "Sales" },
  { emoji: "📈", label: "Marketing" },
  { emoji: "⚖️", label: "Legal" },
  { emoji: "🏭", label: "Operations" },
  { emoji: "💳", label: "Finance" },
  { emoji: "🧑‍💼", label: "HR" },
  { emoji: "📋", label: "Management" },
  { emoji: "📄", label: "General" },
  { emoji: "🚀", label: "Innovation" },
  { emoji: "🎯", label: "Strategy" },
  { emoji: "🛍️", label: "Commerce" },
  { emoji: "🌐", label: "Global" },
];

type Props = {
  onClose: () => void
  onCreated?: (workspaceId: string) => void
}

export function CreateWorkspaceModal({ onClose, onCreated }: Props) {
  const { createAndSelectWorkspace, workspaces } = useWorkspace()
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Collect all department emojis already used in existing workspaces (excluding Admin's Workspace)
  const usedEmojis = new Set<string>(
    workspaces
      .filter(ws => ws.name !== "Admin's Workspace")
      .flatMap(ws => (ws.icon ?? "").split(",").map(s => s.trim()).filter(Boolean))
  )

  // Per-department data: description + member emails
  const [deptData, setDeptData] = useState<Record<string, { description: string; members: string[] }>>({})

  const toggleDept = (emoji: string) => {
    setSelectedDepts(prev =>
      prev.includes(emoji)
        ? prev.filter(d => d !== emoji)
        : [...prev, emoji]
    )
    setDeptData(prev => {
      if (prev[emoji]) return prev
      return { ...prev, [emoji]: { description: "", members: [""] } }
    })
  }

  const updateDeptDesc = (emoji: string, desc: string) => {
    setDeptData(prev => ({ ...prev, [emoji]: { ...prev[emoji], description: desc } }))
  }

  const updateDeptMember = (emoji: string, idx: number, email: string) => {
    setDeptData(prev => {
      const members = [...(prev[emoji]?.members ?? [""])]
      members[idx] = email
      return { ...prev, [emoji]: { ...prev[emoji], members } }
    })
  }

  const addDeptMember = (emoji: string) => {
    setDeptData(prev => ({
      ...prev,
      [emoji]: { ...prev[emoji], members: [...(prev[emoji]?.members ?? [""]), ""] }
    }))
  }

  const removeDeptMember = (emoji: string, idx: number) => {
    setDeptData(prev => {
      const members = (prev[emoji]?.members ?? [""]).filter((_, i) => i !== idx)
      return { ...prev, [emoji]: { ...prev[emoji], members: members.length ? members : [""] } }
    })
  }

  const getDeptLabel = (emoji: string) => ICONS.find(i => i.emoji === emoji)?.label ?? emoji

  const handleCreate = async () => {
    if (selectedDepts.length === 0) { setError("Select at least one department"); return }
    setLoading(true)
    setError("")
    try {
      const wsName = selectedDepts.map(d => getDeptLabel(d)).join(", ")
      const wsDesc = selectedDepts
        .map(d => {
          const desc = deptData[d]?.description?.trim()
          return desc ? `${getDeptLabel(d)}: ${desc}` : null
        })
        .filter(Boolean)
        .join(" | ")
      const ws = await createAndSelectWorkspace(wsName, wsDesc || undefined, selectedDepts.join(","))

      // Invite members for each department
      const inviteResults: { email: string; status: "sent" | "failed" }[] = []
      for (const emoji of selectedDepts) {
        const members = (deptData[emoji]?.members ?? []).filter(e => e.trim())
        for (const email of members) {
          try {
            const res = await fetch("/api/workspace/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestingUserId: ws.owner_id,
                workspaceId: ws.id,
                workspaceName: wsName,
                email: email.trim(),
                role: "member",
              }),
            })
            inviteResults.push({ email: email.trim(), status: res.ok ? "sent" : "failed" })
          } catch {
            inviteResults.push({ email: email.trim(), status: "failed" })
          }
        }
      }

      const sentCount = inviteResults.filter(r => r.status === "sent").length
      const failedCount = inviteResults.filter(r => r.status === "failed").length
      if (sentCount > 0) {
        // toast could be used here if available
      }

      onCreated?.(ws.id)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to create workspace")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet on mobile, centered card on sm+ */}
      <div className="relative z-10 w-full rounded-t-2xl border border-white/10 bg-[#0f1117] shadow-2xl sm:mx-4 sm:max-w-md sm:rounded-2xl">

        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-white/10 sm:hidden" />

        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create workspace</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Department selection */}
            <div>
              <Label className="mb-2 block">
                Departments{" "}
                <span className="text-muted-foreground text-xs">(select all that apply)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(({ emoji, label }) => {
                  const selected = selectedDepts.includes(emoji)
                  const alreadyUsed = usedEmojis.has(emoji)
                  return (
                    <button
                      key={emoji}
                      onClick={() => !alreadyUsed && toggleDept(emoji)}
                      disabled={alreadyUsed}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        alreadyUsed
                          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25"
                          : selected
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <span className="text-sm leading-none">{emoji}</span>
                      <span>{label}</span>
                      {selected && <Check className="h-3 w-3" />}
                      {alreadyUsed && <span className="text-[10px] text-white/20">in use</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Per-department details */}
            {selectedDepts.length > 0 && (
              <div className="space-y-3">
                {selectedDepts.map(emoji => {
                  const data = deptData[emoji] ?? { description: "", members: [""] }
                  return (
                    <div key={emoji} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                      {/* Department header */}
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-base leading-none">{emoji}</span>
                        <span className="text-sm font-semibold text-white">{getDeptLabel(emoji)}</span>
                      </div>

                      {/* Description */}
                      <Input
                        placeholder="What does this department focus on?"
                        value={data.description}
                        onChange={e => updateDeptDesc(emoji, e.target.value)}
                        className="mb-3 text-xs"
                      />

                      {/* Members */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserPlus className="h-3 w-3" />
                          <span>Add team members by email</span>
                        </div>
                        {data.members.map((email, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              type="email"
                              placeholder="colleague@company.com"
                              value={email}
                              onChange={e => updateDeptMember(emoji, idx, e.target.value)}
                              className="text-xs"
                            />
                            {data.members.length > 1 && (
                              <button
                                onClick={() => removeDeptMember(emoji, idx)}
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addDeptMember(emoji)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add another member
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="w-full sm:flex-1"
                disabled={loading || selectedDepts.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create workspace
              </Button>
            </div>
          </div>
        </div>

        {/* Safe area bottom padding on mobile */}
        <div className="h-safe-bottom sm:hidden" />
      </div>
    </div>
  )
}
