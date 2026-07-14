"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, Users, Clock, TrendingUp, CreditCard, Megaphone, BarChart2, UserCog, ShieldCheck, Building2, ChevronDown, ChevronRight, Crown } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getAppSettings } from "@/lib/app-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const TRIAL_PRESETS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
]

type Stats = {
  totalUsers: number
  activeTrials: number
  expiredTrials: number
  activeSubscriptions: number
  canceledSubscriptions: number
  planCounts: Record<string, number>
  mrr: number
  arr: number
  arpu: number
  conversionRate: number
  churnRate: number
}

export default function AdminPage() {
  const { user, role, loading, refreshSubscription } = useAuth()
  const router = useRouter()
  const [trialDays, setTrialDays] = useState(15)
  const [saving, setSaving] = useState(false)
  const [savingBanner, setSavingBanner] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [bannerText, setBannerText] = useState("")
  const [bannerEnabled, setBannerEnabled] = useState(false)
  const [roleEmail, setRoleEmail] = useState("")
  const [roleTarget, setRoleTarget] = useState("admin")
  const [savingRole, setSavingRole] = useState(false)

  // Companies & workspaces
  type CompanyMember = { userId: string; email: string; role: string }
  type CompanyWorkspace = { id: string; name: string; icon: string; createdAt: string; members: CompanyMember[] }
  type Company = { userId: string; email: string; companyName: string; platformRole: string; workspaces: CompanyWorkspace[] }
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [expandedWs, setExpandedWs] = useState<string | null>(null)

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
        setBannerText(settings.announcement_text ?? "")
        setBannerEnabled(settings.announcement_enabled === "true")
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load settings", variant: "error" })
      } finally {
        setSettingsLoading(false)
      }
    }

    async function loadStats() {
      try {
        const res = await fetch(`/api/admin/stats?userId=${user!.id}`)
        const data = await res.json()
        if (res.ok) setStats(data)
      } catch {
      } finally {
        setStatsLoading(false)
      }
    }

    load()
    loadStats()
    loadCompanies()
  }, [user, role, loading, router])

  async function loadCompanies() {
    try {
      const res = await fetch(`/api/admin/companies?userId=${user!.id}`)
      const data = await res.json()
      if (res.ok) setCompanies(data.companies ?? [])
    } catch {
    } finally {
      setCompaniesLoading(false)
    }
  }

  const handleSaveTrial = async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/update-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialDays, requestingUserId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      await refreshSubscription()
      toast({ title: "Saved", description: `Trial period updated to ${trialDays} days.` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBanner = async () => {
    if (!user) return
    setSavingBanner(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestingUserId: user.id,
          settings: {
            announcement_text: bannerText,
            announcement_enabled: bannerEnabled ? "true" : "false",
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      toast({ title: "Saved", description: "Announcement banner updated." })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "error" })
    } finally {
      setSavingBanner(false)
    }
  }

  const handleSetRole = async () => {
    if (!user || !roleEmail.trim()) return
    setSavingRole(true)
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestingUserId: user.id, targetEmail: roleEmail.trim(), role: roleTarget }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update role")
      toast({ title: "Role updated", description: `${roleEmail} is now ${roleTarget}.` })
      setRoleEmail("")
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update role", variant: "error" })
    } finally {
      setSavingRole(false)
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
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Logged in as <span className="text-emerald-400 font-medium">{role}</span></p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Platform Overview</h2>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stats...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
                { label: "Active Trials", value: stats?.activeTrials ?? 0, icon: Clock, color: "text-[#FFBF00]" },
                { label: "Expired Trials", value: stats?.expiredTrials ?? 0, icon: TrendingUp, color: "text-red-400" },
                { label: "Paid Subscribers", value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-emerald-400" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-background p-4 text-center">
                  <stat.icon className={cn("mx-auto mb-2 h-5 w-5", stat.color)} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Metrics */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Metrics</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "MRR", value: `$${stats?.mrr ?? 0}`, sub: "monthly recurring", color: "text-emerald-400" },
                  { label: "ARR", value: `$${stats?.arr ?? 0}`, sub: "annual run rate", color: "text-emerald-400" },
                  { label: "ARPU", value: `$${stats?.arpu ?? 0}`, sub: "avg revenue / user", color: "text-blue-400" },
                  { label: "Conversion", value: `${stats?.conversionRate ?? 0}%`, sub: "trial → paid", color: "text-[#FFBF00]" },
                  { label: "Churn Rate", value: `${stats?.churnRate ?? 0}%`, sub: "of total subs", color: stats?.churnRate && stats.churnRate > 10 ? "text-red-400" : "text-emerald-400" },
                  { label: "Canceled", value: stats?.canceledSubscriptions ?? 0, sub: "all time", color: "text-muted-foreground" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Plan breakdown */}
              {stats?.planCounts && Object.keys(stats.planCounts).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.planCounts).map(([plan, count]) => (
                      <span key={plan} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        {plan}: {count} user{count !== 1 ? "s" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">LTV = ARPU × avg subscription lifespan (months). CAC requires marketing spend data tracked externally.</p>
            </div>
          )}
        </div>

        {/* Companies & Workspaces */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Companies & Workspaces</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">All companies, their workspaces, and member roles across the platform.</p>

          {companiesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies found.</p>
          ) : (
            <div className="space-y-2">
              {companies.map(c => (
                <div key={c.userId} className="rounded-lg border border-white/5 bg-background overflow-hidden">
                  {/* Company header row */}
                  <button
                    onClick={() => setExpandedCompany(expandedCompany === c.userId ? null : c.userId)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    {expandedCompany === c.userId
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <Building2 className="h-4 w-4 shrink-0 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{c.companyName}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      c.platformRole === "super_admin" ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]" :
                      c.platformRole === "admin" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      c.platformRole === "manager" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" :
                      "border-white/10 text-muted-foreground"
                    )}>
                      {c.platformRole}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.workspaces.length} ws</span>
                  </button>

                  {/* Expanded: workspaces */}
                  {expandedCompany === c.userId && (
                    <div className="border-t border-white/5 p-3 space-y-2">
                      {c.workspaces.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">No workspaces.</p>
                      ) : (
                        c.workspaces.map(ws => (
                          <div key={ws.id} className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
                            {/* Workspace header */}
                            <button
                              onClick={() => setExpandedWs(expandedWs === ws.id ? null : ws.id)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                            >
                              {expandedWs === ws.id
                                ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              }
                              <span className="text-base leading-none">{ws.icon}</span>
                              <span className="flex-1 truncate text-sm font-medium">{ws.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{ws.members.length} member{ws.members.length !== 1 ? "s" : ""}</span>
                            </button>

                            {/* Expanded: members */}
                            {expandedWs === ws.id && (
                              <div className="border-t border-white/5 p-2 space-y-1">
                                {ws.members.map(m => (
                                  <div key={m.userId} className="flex items-center gap-2 rounded-md px-3 py-1.5">
                                    {m.role === "owner" && <Crown className="h-3 w-3 shrink-0 text-[#FFBF00]" />}
                                    <span className="flex-1 truncate text-xs text-white/80">{m.email}</span>
                                    <span className={cn(
                                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                      m.role === "owner" ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]" :
                                      m.role === "admin" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                                      "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                    )}>
                                      {m.role}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Management */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">User Role Management</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Assign or change roles for any user by their email address.</p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="roleEmail">User email</Label>
              <Input
                id="roleEmail"
                type="email"
                placeholder="user@example.com"
                value={roleEmail}
                onChange={(e) => setRoleEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="roleTarget">Assign role</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {["user", "manager", "admin", "super_admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleTarget(r)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      roleTarget === r
                        ? r === "super_admin"
                          ? "border-[#FFBF00] bg-[#FFBF00]/10 text-[#FFBF00]"
                          : "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
                    )}
                  >
                    {r === "super_admin" && <ShieldCheck className="mr-1 inline h-3 w-3" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSetRole} disabled={savingRole || !roleEmail.trim()} className="w-full sm:w-auto">
              {savingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
              Update role
            </Button>
          </div>
        </div>

        {/* Trial Configuration */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trial Configuration</h2>
          <p className="mb-4 text-xs text-muted-foreground">Controls how many days new users get free access when they sign up.</p>
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <Label className="mb-2 block">Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                {TRIAL_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setTrialDays(p.value)}
                    className={cn(
                      "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
                      trialDays === p.value
                        ? "border-[#FFBF00] bg-[#FFBF00]/10 text-[#FFBF00]"
                        : "border-border text-muted-foreground hover:border-[#FFBF00]/50 hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div>
              <Label htmlFor="trialDays">Custom value (days)</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <Input
                  id="trialDays"
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 1)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  = <span className="font-semibold text-foreground">{trialDays} days</span> free access per new user
                </span>
              </div>
            </div>

            <Button onClick={handleSaveTrial} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save trial period
            </Button>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Announcement Banner</h2>
          <p className="mb-4 text-xs text-muted-foreground">Show a message to all users at the top of the app (e.g. maintenance notice, new feature).</p>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={bannerEnabled}
                onClick={() => setBannerEnabled(!bannerEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none",
                  bannerEnabled ? "bg-[#FFBF00]" : "bg-muted"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  bannerEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
              <span className="text-sm select-none">{bannerEnabled ? "Banner enabled" : "Banner disabled"}</span>
            </label>
            <div>
              <Label htmlFor="bannerText">Message</Label>
              <Input
                id="bannerText"
                type="text"
                placeholder="e.g. We're upgrading servers on July 20 from 2–4am UTC."
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleSaveBanner} disabled={savingBanner} className="w-full sm:w-auto">
              {savingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              Save banner
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
