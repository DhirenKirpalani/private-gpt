"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getAppSettings, updateAppSetting } from "@/lib/app-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "@/components/ui/toast"

export default function AdminPage() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const [trialDays, setTrialDays] = useState(15)
  const [saving, setSaving] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user || role !== "super_admin") {
      router.push("/")
      return
    }
    async function load() {
      try {
        const settings = await getAppSettings()
        setTrialDays(settings.trial_days)
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load settings", variant: "error" })
      } finally {
        setSettingsLoading(false)
      }
    }
    load()
  }, [user, role, loading, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAppSetting("trial_days", String(trialDays))
      toast({ title: "Saved", description: `Trial period updated to ${trialDays} days.` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading || settingsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <Toaster />
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Super Admin</h1>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trial Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trialDays">Free trial period (days)</Label>
              <Input
                id="trialDays"
                type="number"
                min={1}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 0)}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                New users and existing users without a subscription will get this many days of trial access.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Role Info</h2>
          <p className="text-sm">
            Your role: <span className="font-semibold text-emerald-400">{role}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Admin, manager, and user roles can be added later in the profiles table.
          </p>
        </div>
      </div>
    </div>
  )
}
