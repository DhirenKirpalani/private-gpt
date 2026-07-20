"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, Users, Clock, TrendingUp, CreditCard, Megaphone, BarChart2, UserCog, ShieldCheck, Building2, ChevronDown, ChevronRight, Crown, Shield, User, AlertTriangle, Bell } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getAppSettings } from "@/lib/app-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { getFirstDeptIcon } from "@/lib/workspace-icons"

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
  // Revenue
  ltv: number
  revenueChurnRate: number
  netRevenueRetention: number
  mrrGrowthRate: number
  newMrrThisMonth: number
  // Conversion
  soloToTeamRate: number
  // Usage
  dau: number
  mau: number
  stickiness: number
  docsPerUser: number
  messagesPerUser: number
  totalDocuments: number
  totalChatMessages: number
  // Workspace
  totalWorkspaces: number
  seatsPerWorkspace: number
  newWorkspaces30d: number
  // Seats
  totalActiveSeats: number
  avgSeatsPerTeam: number
  newSeats30d: number
  // Growth
  userGrowthRate: number
  // Cohort
  retention30d: number
  users30dAgo: number
  users60dAgo: number
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
    <div className="min-h-screen bg-[#0f1520] p-6 sm:p-10">
      <Toaster />
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/chat" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFBF00]/10 border border-[#FFBF00]/20">
            <ShieldCheck className="h-5 w-5 text-[#FFBF00]" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Platform control panel · Logged in as <span className="text-[#FFBF00] font-medium">{role}</span></p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Platform Overview</h2>
          </div>
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
                <div key={stat.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                  <stat.icon className={cn("mx-auto mb-2 h-5 w-5", stat.color)} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Metrics */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Business Metrics</h2>
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
                  <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
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
              <p className="text-[10px] text-muted-foreground">LTV = ARPU / churn rate. NRR includes seat expansion revenue.</p>
            </div>
          )}
        </div>

        {/* Revenue & Retention */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Revenue & Retention</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "LTV", value: `$${stats?.ltv ?? 0}`, sub: "lifetime value", color: "text-emerald-400" },
                { label: "NRR", value: `${stats?.netRevenueRetention ?? 100}%`, sub: "net revenue retention", color: "text-emerald-400" },
                { label: "Revenue Churn", value: `${stats?.revenueChurnRate ?? 0}%`, sub: "lost MRR / total", color: (stats?.revenueChurnRate ?? 0) > 10 ? "text-red-400" : "text-emerald-400" },
                { label: "MRR Growth", value: `${stats?.mrrGrowthRate ?? 0}%`, sub: "new MRR / total MRR", color: "text-[#FFBF00]" },
                { label: "New MRR (30d)", value: `$${stats?.newMrrThisMonth ?? 0}`, sub: "this month", color: "text-emerald-400" },
                { label: "Solo → Team", value: `${stats?.soloToTeamRate ?? 0}%`, sub: "upgrade rate", color: "text-purple-400" },
                { label: "User Growth", value: `${stats?.userGrowthRate ?? 0}%`, sub: "last 30 days", color: "text-blue-400" },
                { label: "Retention 30d", value: `${stats?.retention30d ?? 0}%`, sub: "users active from 30d ago", color: (stats?.retention30d ?? 0) < 50 ? "text-red-400" : "text-emerald-400" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage & Engagement */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-blue-400/60" />
            <h2 className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">Usage & Engagement</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "DAU", value: stats?.dau ?? 0, sub: "active in last 24h", color: "text-blue-400" },
                { label: "MAU", value: stats?.mau ?? 0, sub: "total registered", color: "text-blue-400" },
                { label: "Stickiness", value: `${stats?.stickiness ?? 0}%`, sub: "DAU / MAU ratio", color: (stats?.stickiness ?? 0) > 20 ? "text-emerald-400" : "text-[#FFBF00]" },
                { label: "Docs / User", value: stats?.docsPerUser ?? 0, sub: "avg documents", color: "text-purple-400" },
                { label: "Messages / User", value: stats?.messagesPerUser ?? 0, sub: "avg chat messages", color: "text-purple-400" },
                { label: "Total Docs", value: stats?.totalDocuments ?? 0, sub: "all documents", color: "text-muted-foreground" },
                { label: "Total Messages", value: stats?.totalChatMessages ?? 0, sub: "all chat messages", color: "text-muted-foreground" },
                { label: "Users (30d ago)", value: stats?.users30dAgo ?? 0, sub: "registered 30d ago", color: "text-muted-foreground" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspace & Seats */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-purple-400/60" />
            <h2 className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-widest">Workspace & Seats</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Workspaces", value: stats?.totalWorkspaces ?? 0, sub: "all workspaces", color: "text-blue-400" },
                { label: "New Workspaces (30d)", value: stats?.newWorkspaces30d ?? 0, sub: "created this month", color: "text-emerald-400" },
                { label: "Seats / Workspace", value: stats?.seatsPerWorkspace ?? 0, sub: "avg team size", color: "text-purple-400" },
                { label: "Total Active Seats", value: stats?.totalActiveSeats ?? 0, sub: "team plan seats", color: "text-emerald-400" },
                { label: "Avg Seats / Team", value: stats?.avgSeatsPerTeam ?? 0, sub: "team plan only", color: "text-[#FFBF00]" },
                { label: "New Seats (30d)", value: stats?.newSeats30d ?? 0, sub: "members added this month", color: "text-emerald-400" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Companies & Workspaces */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Companies & Workspaces</h2>
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
                              {(() => { const Icon = getFirstDeptIcon(ws.icon); return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> })()}
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
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <UserCog className="h-3.5 w-3.5 text-blue-400/60" />
            <h2 className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">User Role Management</h2>
          </div>
          <p className="mb-5 text-xs text-muted-foreground">Assign or change roles for any user. The user will receive an email notification.</p>
          <div className="space-y-5">
            <div>
              <Label htmlFor="roleEmail" className="text-sm font-medium text-white/80">User email</Label>
              <Input
                id="roleEmail"
                type="email"
                placeholder="user@example.com"
                value={roleEmail}
                onChange={(e) => setRoleEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetRole()}
                className="mt-1.5 bg-white/[0.03] border-white/10"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-white/80">Assign role</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  { id: "user", label: "User", desc: "Standard access", icon: User, color: "text-white/60", active: "border-white/30 bg-white/5 text-white" },
                  { id: "manager", label: "Manager", desc: "Team oversight", icon: Users, color: "text-blue-400", active: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
                  { id: "admin", label: "Admin", desc: "Full platform", icon: Shield, color: "text-emerald-400", active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
                  { id: "super_admin", label: "Super Admin", desc: "God mode", icon: ShieldCheck, color: "text-[#FFBF00]", active: "border-[#FFBF00]/40 bg-[#FFBF00]/10 text-[#FFBF00]" },
                ] as const).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRoleTarget(r.id)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors",
                      roleTarget === r.id ? r.active : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <r.icon className={cn("h-4 w-4 mb-1", roleTarget === r.id ? "" : "text-muted-foreground")} />
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {roleTarget === "super_admin" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#FFBF00]/20 bg-[#FFBF00]/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFBF00] mt-0.5" />
                <p className="text-xs text-[#FFBF00]/80">
                  <span className="font-semibold">Super admin grants full platform control</span> — access to all companies, billing, and the ability to promote other users. Use with extreme caution.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSetRole}
                disabled={savingRole || !roleEmail.trim()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                  roleTarget === "super_admin"
                    ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00] hover:bg-[#FFBF00]/15"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/40"
                )}
              >
                {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Update role & notify user
              </button>
            </div>
          </div>
        </div>

        {/* Trial Configuration */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">Trial Configuration</h2>
          </div>
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

            <button
              onClick={handleSaveTrial}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:border-emerald-500/40 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save trial period
            </button>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-purple-400/60" />
            <h2 className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-widest">Announcement Banner</h2>
          </div>
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
            <button
              onClick={handleSaveBanner}
              disabled={savingBanner}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:border-emerald-500/40 disabled:opacity-50"
            >
              {savingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Save banner
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
