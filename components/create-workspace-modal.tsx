"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { useWorkspace } from "@/app/workspace-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ICONS = ["🏢", "📊", "💼", "🎯", "🚀", "💡", "🛒", "📱", "🌍", "🔧", "📣", "💰"]

type Props = {
  onClose: () => void
  onCreated?: (workspaceId: string) => void
}

export function CreateWorkspaceModal({ onClose, onCreated }: Props) {
  const { createAndSelectWorkspace } = useWorkspace()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("🏢")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!name.trim()) { setError("Workspace name is required"); return }
    setLoading(true)
    setError("")
    try {
      const ws = await createAndSelectWorkspace(name.trim(), description.trim() || undefined, icon)
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

        <div className="p-5 sm:p-6">
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
            {/* Icon picker */}
            <div>
              <Label className="mb-2 block">Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(i => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-lg border text-xl transition-colors",
                      icon === i
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="ws-name">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="ws-name"
                placeholder="e.g. Marketing, Finance, Operations"
                value={name}
                onChange={e => { setName(e.target.value); setError("") }}
                className="mt-1.5"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="ws-desc">
                Description{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="ws-desc"
                placeholder="What does this workspace focus on?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1.5"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Actions — stacked on mobile, side-by-side on sm+ */}
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
                disabled={loading || !name.trim()}
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
