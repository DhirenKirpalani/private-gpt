"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, Users, Clock, TrendingUp, CreditCard, Megaphone, BarChart2, UserCog, ShieldCheck, Building2, ChevronDown, ChevronRight, Crown, Shield, User, AlertTriangle, Bell, Activity, Zap, CheckCircle2, XCircle, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/auth-provider"
import { getAppSettings } from "@/lib/app-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { getFirstDeptIcon } from "@/lib/workspace-icons"
import { useI18n } from "@/lib/i18n"

const TRIAL_PRESETS = [
  { value: 7 },
  { value: 14 },
  { value: 30 },
  { value: 60 },
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
  const { t } = useI18n()
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

  // API Monitoring
  type ApiLog = { id: string; method: string; endpoint: string; status_code: number; duration_ms: number | null; error: string | null; created_at: string; user_id: string | null; user_name: string; user_email: string }
  type ApiEndpointStat = { endpoint: string; total: number; success: number; errors: number; errorRate: number; avgDuration: number; lastCalled: string; peakHour: { hour: string; total: number } | null; hourlyTrend: { hour: string; total: number; errors: number; avgDuration: number }[] }
  type ApiHourly = { hour: string; total: number; errors: number; success: number; avgDuration: number; errorRate: number }
  type ApiUserStat = { userId: string; name: string; email: string; total: number; success: number; errors: number; errorRate: number; avgDuration: number }
  type ApiMonitorData = {
    total: number; successCount: number; errorCount: number; successRate: number; errorRate: number; avgDuration: number
    reqPerHour: number; peakHour: { hour: string; total: number } | null
    endpoints: ApiEndpointStat[]; topUsers: ApiUserStat[]; recentLogs: ApiLog[]; hourly: ApiHourly[]
    statusCodes: { code: number; count: number }[]
    topErrors: { endpoint: string; count: number }[]
    durationTrend: { hour: string; avgDuration: number }[]
    successRateTrend: { hour: string; successRate: number }[]
  }
  const [apiMonitor, setApiMonitor] = useState<ApiMonitorData | null>(null)
  const [apiMonitorLoading, setApiMonitorLoading] = useState(true)
  const [apiMonitorRange, setApiMonitorRange] = useState<"24h" | "7d" | "30d">("24h")
  const [apiLogsPage, setApiLogsPage] = useState(0)

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
    loadApiMonitor()
  }, [user, role, loading, router])

  async function loadApiMonitor(range?: string) {
    try {
      const r = range || apiMonitorRange
      const res = await fetch(`/api/admin/api-monitoring?userId=${user!.id}&range=${r}`)
      const data = await res.json()
      if (res.ok) setApiMonitor(data)
    } catch {
      console.error("[ADMIN] Failed to load API monitoring data")
    } finally {
      setApiMonitorLoading(false)
    }
  }

  useEffect(() => {
    if (user && role === "super_admin") loadApiMonitor(apiMonitorRange)
  }, [apiMonitorRange])

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
            <h1 className="text-xl font-bold text-white">{t("adminTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("adminSubtitle")} · {t("adminLoggedInAs")} <span className="text-[#FFBF00] font-medium">{role}</span></p>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">{t("adminPlatformOverview")}</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoadingStats")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t("adminTotalUsers"), value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
                { label: t("adminActiveTrials"), value: stats?.activeTrials ?? 0, icon: Clock, color: "text-[#FFBF00]" },
                { label: t("adminExpiredTrials"), value: stats?.expiredTrials ?? 0, icon: TrendingUp, color: "text-red-400" },
                { label: t("adminPaidSubscribers"), value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-emerald-400" },
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
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">{t("adminBusinessMetrics")}</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "MRR", value: `$${stats?.mrr ?? 0}`, sub: t("adminMonthlyRecurring"), color: "text-emerald-400" },
                  { label: "ARR", value: `$${stats?.arr ?? 0}`, sub: t("adminAnnualRunRate"), color: "text-emerald-400" },
                  { label: "ARPU", value: `$${stats?.arpu ?? 0}`, sub: t("adminAvgRevenueUser"), color: "text-blue-400" },
                  { label: t("adminConversion"), value: `${stats?.conversionRate ?? 0}%`, sub: t("adminTrialPaid"), color: "text-[#FFBF00]" },
                  { label: t("adminChurnRate"), value: `${stats?.churnRate ?? 0}%`, sub: t("adminOfTotalSubs"), color: stats?.churnRate && stats.churnRate > 10 ? "text-red-400" : "text-emerald-400" },
                  { label: t("adminCanceled"), value: stats?.canceledSubscriptions ?? 0, sub: t("adminAllTime"), color: "text-muted-foreground" },
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
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("adminPlanBreakdown")}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.planCounts).map(([plan, count]) => (
                      <span key={plan} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        {plan}: {count} {count !== 1 ? t("adminUsers") : t("adminUser")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">{t("adminLtvFormula")}</p>
            </div>
          )}
        </div>

        {/* Revenue & Retention */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">{t("adminRevenueRetention")}</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "LTV", value: `$${stats?.ltv ?? 0}`, sub: t("adminLifetimeValue"), color: "text-emerald-400" },
                { label: "NRR", value: `${stats?.netRevenueRetention ?? 100}%`, sub: t("adminNetRevenueRetention"), color: "text-emerald-400" },
                { label: t("adminRevenueChurn"), value: `${stats?.revenueChurnRate ?? 0}%`, sub: t("adminLostMrr"), color: (stats?.revenueChurnRate ?? 0) > 10 ? "text-red-400" : "text-emerald-400" },
                { label: t("adminMrrGrowth"), value: `${stats?.mrrGrowthRate ?? 0}%`, sub: t("adminNewMrrTotal"), color: "text-[#FFBF00]" },
                { label: t("adminNewMrr30d"), value: `$${stats?.newMrrThisMonth ?? 0}`, sub: t("adminThisMonth"), color: "text-emerald-400" },
                { label: t("adminSoloToTeam"), value: `${stats?.soloToTeamRate ?? 0}%`, sub: t("adminUpgradeRate"), color: "text-purple-400" },
                { label: t("adminUserGrowth"), value: `${stats?.userGrowthRate ?? 0}%`, sub: t("adminLast30Days"), color: "text-blue-400" },
                { label: t("adminRetention30d"), value: `${stats?.retention30d ?? 0}%`, sub: t("adminUsersActive30d"), color: (stats?.retention30d ?? 0) < 50 ? "text-red-400" : "text-emerald-400" },
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
            <h2 className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">{t("adminUsageEngagement")}</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "DAU", value: stats?.dau ?? 0, sub: t("adminActive24h"), color: "text-blue-400" },
                { label: "MAU", value: stats?.mau ?? 0, sub: t("adminTotalRegistered"), color: "text-blue-400" },
                { label: t("adminStickiness"), value: `${stats?.stickiness ?? 0}%`, sub: t("adminDauMauRatio"), color: (stats?.stickiness ?? 0) > 20 ? "text-emerald-400" : "text-[#FFBF00]" },
                { label: t("adminDocsPerUser"), value: stats?.docsPerUser ?? 0, sub: t("adminAvgDocuments"), color: "text-purple-400" },
                { label: t("adminMessagesPerUser"), value: stats?.messagesPerUser ?? 0, sub: t("adminAvgChatMessages"), color: "text-purple-400" },
                { label: t("adminTotalDocs"), value: stats?.totalDocuments ?? 0, sub: t("adminAllDocuments"), color: "text-muted-foreground" },
                { label: t("adminTotalMessages"), value: stats?.totalChatMessages ?? 0, sub: t("adminAllChatMessages"), color: "text-muted-foreground" },
                { label: t("adminUsers30dAgo"), value: stats?.users30dAgo ?? 0, sub: t("adminRegistered30d"), color: "text-muted-foreground" },
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

        {/* API Monitoring */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400/60" />
              <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">API Monitoring</h2>
            </div>
            <div className="flex items-center gap-1">
              {(["24h", "7d", "30d"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setApiMonitorRange(r)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors",
                    apiMonitorRange === r ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {apiMonitorLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading API data...
            </div>
          ) : !apiMonitor || apiMonitor.total === 0 ? (
            <p className="text-sm text-muted-foreground">No API requests logged yet. Stats and error logs will appear here as API routes are called.</p>
          ) : (
            <div className="space-y-6">
              {/* ── Top Row: Donut + Metrics ── */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Donut */}
                <div className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-4 flex flex-col items-center justify-center">
                  <p className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Health Score</p>
                  {(() => {
                    const total = apiMonitor.total || 1
                    const sPct = (apiMonitor.successCount / total) * 100
                    const ePct = (apiMonitor.errorCount / total) * 100
                    const r = 52, c = 2 * Math.PI * r
                    return (
                      <div className="relative w-36 h-36">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(52 211 153)" strokeWidth="10"
                            strokeDasharray={`${(sPct/100)*c} ${c-(sPct/100)*c}`} strokeLinecap="round" />
                          {apiMonitor.errorCount > 0 && (
                            <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(239 68 68)" strokeWidth="10"
                              strokeDasharray={`${(ePct/100)*c} ${c-(ePct/100)*c}`} strokeDashoffset={-(sPct/100)*c} strokeLinecap="round" />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={cn("text-3xl font-bold", apiMonitor.successRate >= 95 ? "text-emerald-400" : apiMonitor.successRate >= 80 ? "text-yellow-400" : "text-red-400")}>{apiMonitor.successRate}%</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">success</span>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="flex items-center gap-4 mt-3 text-[10px]">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />{apiMonitor.successCount} ok</span>
                    <span className="flex items-center gap-1.5 text-red-400"><span className="h-2 w-2 rounded-full bg-red-400" />{apiMonitor.errorCount} err</span>
                  </div>
                </div>
                {/* Metric Cards */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border-l-2 border-blue-500/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><Zap className="h-3.5 w-3.5 text-blue-400" /><span className="text-[10px] text-muted-foreground uppercase">Total</span></div>
                    <p className="text-2xl font-bold">{apiMonitor.total}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">requests</p>
                  </div>
                  <div className="rounded-xl border-l-2 border-[#FFBF00]/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><Clock className="h-3.5 w-3.5 text-[#FFBF00]" /><span className="text-[10px] text-muted-foreground uppercase">Latency</span></div>
                    <p className="text-2xl font-bold text-[#FFBF00]">{apiMonitor.avgDuration}<span className="text-sm">ms</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">avg response</p>
                  </div>
                  <div className="rounded-xl border-l-2 border-purple-500/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-3.5 w-3.5 text-purple-400" /><span className="text-[10px] text-muted-foreground uppercase">Throughput</span></div>
                    <p className="text-2xl font-bold text-purple-400">{apiMonitor.reqPerHour}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">req / hour</p>
                  </div>
                  <div className="rounded-xl border-l-2 border-emerald-500/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[10px] text-muted-foreground uppercase">Success</span></div>
                    <p className="text-2xl font-bold text-emerald-400">{apiMonitor.successCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{apiMonitor.successRate}% of total</p>
                  </div>
                  <div className="rounded-xl border-l-2 border-red-500/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><XCircle className="h-3.5 w-3.5 text-red-400" /><span className="text-[10px] text-muted-foreground uppercase">Errors</span></div>
                    <p className="text-2xl font-bold text-red-400">{apiMonitor.errorCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{apiMonitor.errorRate}% of total</p>
                  </div>
                  <div className="rounded-xl border-l-2 border-cyan-500/50 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1"><BarChart2 className="h-3.5 w-3.5 text-cyan-400" /><span className="text-[10px] text-muted-foreground uppercase">Peak</span></div>
                    <p className="text-2xl font-bold text-cyan-400">{apiMonitor.peakHour?.total ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{apiMonitor.peakHour ? new Date(apiMonitor.peakHour.hour).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Request Volume Bar Chart ── */}
              {apiMonitor.hourly.length > 0 && (
                <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-white/80">Request Volume</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-500/60" /> Success</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-500/70" /> Errors</span>
                    </div>
                  </div>
                  {(() => {
                    const maxTotal = Math.max(...apiMonitor.hourly.map(x => x.total), 1)
                    const isSingle = apiMonitor.hourly.length === 1

                    if (isSingle) {
                      const h = apiMonitor.hourly[0]
                      const errorPct = h.total > 0 ? (h.errors / h.total) * 100 : 0
                      return (
                        <div>
                          {/* Y-axis labels + bar area */}
                          <div className="flex gap-2 h-40">
                            {/* Y-axis */}
                            <div className="flex flex-col justify-between text-[9px] text-muted-foreground/50 py-0.5">
                              <span>{maxTotal}</span>
                              <span>{Math.round(maxTotal * 0.75)}</span>
                              <span>{Math.round(maxTotal * 0.5)}</span>
                              <span>{Math.round(maxTotal * 0.25)}</span>
                              <span>0</span>
                            </div>
                            {/* Bar area with gridlines */}
                            <div className="flex-1 relative">
                              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-white/[0.04]" />)}
                              </div>
                              <div className="absolute inset-0 flex items-end justify-center">
                                <div className="group relative" style={{ width: "45%", height: "100%" }}>
                                  <div className="w-full h-full rounded-t-lg rounded-b-md relative overflow-hidden transition-all group-hover:brightness-125" style={{ background: "linear-gradient(180deg, rgba(52,211,153,0.7) 0%, rgba(52,211,153,0.25) 100%)" }}>
                                    {errorPct > 0 && <div className="absolute bottom-0 w-full" style={{ height: `${errorPct}%`, background: "linear-gradient(180deg, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.5) 100%)" }} />}
                                    {/* Value inside bar */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-2xl font-bold text-white/90">{h.total}</span>
                                      <span className="text-[9px] text-white/50 mt-0.5">requests</span>
                                    </div>
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-lg bg-black/95 px-3 py-2 text-[10px] text-white z-30 border border-white/10 shadow-xl">
                                    <div className="font-medium text-white/90 mb-1">{h.hour.slice(5, 16).replace("T", " ")}</div>
                                    <div className="flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{h.success} success</div>
                                    <div className="flex items-center gap-1.5 text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />{h.errors} errors</div>
                                    <div className="flex items-center gap-1.5 text-yellow-400 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />{h.avgDuration}ms avg</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* X-axis */}
                          <div className="flex gap-2 mt-1.5">
                            <div className="w-6" />
                            <div className="flex-1 text-center text-[9px] text-muted-foreground border-t border-white/[0.04] pt-1.5">
                              {h.hour.slice(5, 16).replace("T", " ")}
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground text-center mt-2">Collecting data — more bars appear as requests come in across different hours</p>
                        </div>
                      )
                    }

                    return (
                      <div>
                        <div className="relative">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-white/[0.03]" />)}
                          </div>
                          <div className="flex items-end gap-1.5 h-36 relative">
                            {apiMonitor.hourly.map((h, i) => {
                              const heightPct = Math.max((h.total / maxTotal) * 100, 3)
                              const errorPct = h.total > 0 ? (h.errors / h.total) * 100 : 0
                              return (
                                <div key={i} className="flex flex-col items-center justify-end group relative" style={{ flex: 1, minWidth: 12 }}>
                                  <span className="text-[9px] font-medium text-white/40 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{h.total}</span>
                                  <div className="w-full rounded-t-md relative overflow-hidden transition-all group-hover:brightness-125" style={{ height: `${heightPct}%`, background: "linear-gradient(180deg, rgba(52,211,153,0.6) 0%, rgba(52,211,153,0.3) 100%)" }}>
                                    {errorPct > 0 && <div className="absolute bottom-0 w-full" style={{ height: `${errorPct}%`, background: "linear-gradient(180deg, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.5) 100%)" }} />}
                                  </div>
                                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-lg bg-black/95 px-3 py-2 text-[10px] text-white z-30 border border-white/10 shadow-xl">
                                    <div className="font-medium text-white/90 mb-1">{h.hour.slice(5, 16).replace("T", " ")}</div>
                                    <div className="flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{h.success} success</div>
                                    <div className="flex items-center gap-1.5 text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />{h.errors} errors</div>
                                    <div className="flex items-center gap-1.5 text-yellow-400 mt-0.5"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />{h.avgDuration}ms avg</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] text-muted-foreground border-t border-white/[0.03] pt-2">
                          <span>{apiMonitor.hourly[0]?.hour.slice(5, 16).replace("T", " ")}</span>
                          <span>{apiMonitor.hourly[apiMonitor.hourly.length - 1]?.hour.slice(5, 16).replace("T", " ")}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ── Two-column: Success Rate + Response Time ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {apiMonitor.successRateTrend.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="text-xs font-medium text-white/80 mb-3">Success Rate Trend</p>
                    <div className="relative h-28">
                      {(() => {
                        const pts = apiMonitor.successRateTrend
                        if (pts.length === 1) {
                          const pct = pts[0].successRate
                          return (
                            <div className="flex flex-col justify-center h-full gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Current</span>
                                <span className={cn("text-lg font-bold", pct >= 95 ? "text-emerald-400" : pct >= 80 ? "text-yellow-400" : "text-red-400")}>{pct}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, rgba(52,211,153,0.8) 0%, rgba(52,211,153,0.4) 100%)" }} />
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                <span>0%</span><span>50%</span><span>100%</span>
                              </div>
                              <p className="text-[9px] text-muted-foreground text-center mt-1">Collecting data — trend chart appears with more data points</p>
                            </div>
                          )
                        }
                        const w = pts.length - 1
                        const points = pts.map((p, i) => `${i},${100 - p.successRate}`).join(" ")
                        return (
                          <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${w} 100`}>
                            <defs><linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.3)" /><stop offset="100%" stopColor="rgba(52,211,153,0)" /></linearGradient></defs>
                            {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                            <polygon points={`0,100 ${points} ${w},100`} fill="url(#sGrad)" />
                            <polyline points={points} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            {pts.map((p, i) => <circle key={i} cx={i} cy={100 - p.successRate} r="1.5" fill="rgb(52 211 153)" vectorEffect="non-scaling-stroke" />)}
                          </svg>
                        )
                      })()}
                      <div className="absolute top-0 left-0 text-[9px] text-emerald-400/50">100%</div>
                      <div className="absolute bottom-0 left-0 text-[9px] text-muted-foreground/50">0%</div>
                    </div>
                  </div>
                )}
                {apiMonitor.durationTrend.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="text-xs font-medium text-white/80 mb-3">Response Time Trend</p>
                    <div className="relative h-28">
                      {(() => {
                        const pts = apiMonitor.durationTrend
                        if (pts.length === 1) {
                          const ms = pts[0].avgDuration
                          const maxBar = Math.max(ms, 10000)
                          const pct = Math.min((ms / maxBar) * 100, 100)
                          const label = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
                          return (
                            <div className="flex flex-col justify-center h-full gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Current</span>
                                <span className={cn("text-lg font-bold", ms < 1000 ? "text-emerald-400" : ms < 5000 ? "text-yellow-400" : "text-red-400")}>{label}</span>
                              </div>
                              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, rgba(250,204,21,0.8) 0%, rgba(250,204,21,0.4) 100%)" }} />
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                <span>0ms</span><span>5s</span><span>10s+</span>
                              </div>
                              <p className="text-[9px] text-muted-foreground text-center mt-1">Collecting data — trend chart appears with more data points</p>
                            </div>
                          )
                        }
                        const maxDur = Math.max(...pts.map(d => d.avgDuration), 1)
                        const w = pts.length - 1
                        const points = pts.map((p, i) => `${i},${100 - (p.avgDuration / maxDur) * 100}`).join(" ")
                        return (
                          <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${w} 100`}>
                            <defs><linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(250,204,21,0.25)" /><stop offset="100%" stopColor="rgba(250,204,21,0)" /></linearGradient></defs>
                            {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                            <polygon points={`0,100 ${points} ${w},100`} fill="url(#dGrad)" />
                            <polyline points={points} fill="none" stroke="rgb(250 204 21)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            {pts.map((p, i) => <circle key={i} cx={i} cy={100 - (p.avgDuration / maxDur) * 100} r="1.5" fill="rgb(250 204 21)" vectorEffect="non-scaling-stroke" />)}
                          </svg>
                        )
                      })()}
                      <div className="absolute top-0 left-0 text-[9px] text-yellow-400/50">peak</div>
                      <div className="absolute bottom-0 left-0 text-[9px] text-muted-foreground/50">0ms</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Endpoint Health Cards ── */}
              <div>
                <p className="mb-3 text-xs font-medium text-white/80">Endpoint Health</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {apiMonitor.endpoints.map(ep => (
                    <div key={ep.endpoint} className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-white truncate">{ep.endpoint}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold", ep.errorRate === 0 ? "bg-emerald-500/10 text-emerald-400" : ep.errorRate <= 10 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                          {ep.errorRate === 0 ? "HEALTHY" : `${ep.errorRate}% ERR`}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div><p className="text-lg font-bold">{ep.total}</p><p className="text-[9px] text-muted-foreground">requests</p></div>
                        <div><p className="text-lg font-bold text-[#FFBF00]">{ep.avgDuration}ms</p><p className="text-[9px] text-muted-foreground">avg latency</p></div>
                        <div><p className="text-lg font-bold text-emerald-400">{ep.success}</p><p className="text-[9px] text-muted-foreground">successes</p></div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${ep.errorRate === 0 ? 100 : 100 - ep.errorRate}%` }} />
                      </div>
                      {ep.hourlyTrend.length > 1 && (
                        <div className="flex items-end gap-px h-5 mt-2">
                          {(() => {
                            const maxT = Math.max(...ep.hourlyTrend.map(t => t.total), 1)
                            return ep.hourlyTrend.map((t, i) => (
                              <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max((t.total / maxT) * 100, 5)}%`, backgroundColor: t.errors > 0 ? "rgba(239,68,68,0.5)" : "rgba(52,211,153,0.4)", minWidth: 2 }} title={`${t.hour.slice(11, 16)}: ${t.total} req, ${t.errors} err, ${t.avgDuration}ms`} />
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Top Users by Request Volume ── */}
              {apiMonitor.topUsers && apiMonitor.topUsers.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium text-white/80">Top Users by Request Volume</p>
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <div className="space-y-2">
                      {apiMonitor.topUsers.map((u, i) => {
                        const maxTotal = Math.max(...apiMonitor.topUsers.map(t => t.total), 1)
                        return (
                          <div key={u.userId} className="flex items-center gap-3">
                            <span className="shrink-0 w-5 text-[10px] font-bold text-muted-foreground text-right">{i + 1}</span>
                            <div className="shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/70">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-white truncate">{u.name}</span>
                                {u.email && <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{u.email}</span>}
                                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold", u.errorRate === 0 ? "bg-emerald-500/10 text-emerald-400" : u.errorRate <= 10 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                                  {u.errorRate === 0 ? "HEALTHY" : `${u.errorRate}% ERR`}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500/50 to-purple-500/50" style={{ width: `${(u.total / maxTotal) * 100}%` }} />
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-bold">{u.total}</p>
                              <p className="text-[9px] text-muted-foreground">{u.avgDuration}ms</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Two-column: Status Codes + Top Errors ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {apiMonitor.statusCodes.length > 0 ? (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="mb-3 text-xs font-medium text-white/80">Status Code Distribution</p>
                    <div className="space-y-2">
                      {apiMonitor.statusCodes.map(sc => {
                        const maxCount = Math.max(...apiMonitor.statusCodes.map(s => s.count), 1)
                        return (
                          <div key={sc.code} className="flex items-center gap-2">
                            <span className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold w-14 text-center", sc.code < 300 ? "bg-emerald-500/15 text-emerald-400" : sc.code < 400 ? "bg-blue-500/15 text-blue-400" : sc.code < 500 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400")}>{sc.code}</span>
                            <div className="flex-1 h-5 rounded-md bg-white/5 overflow-hidden">
                              <div className={cn("h-full rounded-md", sc.code < 300 ? "bg-emerald-500/50" : sc.code < 400 ? "bg-blue-500/50" : sc.code < 500 ? "bg-yellow-500/50" : "bg-red-500/50")} style={{ width: `${(sc.count / maxCount) * 100}%` }} />
                            </div>
                            <span className="shrink-0 text-[10px] font-medium text-muted-foreground w-8 text-right">{sc.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="mb-3 text-xs font-medium text-white/80">Status Code Distribution</p>
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/40 mb-2" />
                        <p className="text-[10px] text-emerald-400/60">All 2xx — no error status codes</p>
                      </div>
                    </div>
                  </div>
                )}
                {apiMonitor.topErrors.length > 0 ? (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="mb-3 text-xs font-medium text-white/80">Top Error Endpoints</p>
                    <div className="space-y-2">
                      {apiMonitor.topErrors.map((te, i) => {
                        const maxErr = Math.max(...apiMonitor.topErrors.map(t => t.count), 1)
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="flex-1 truncate text-[10px] text-white/70">{te.endpoint}</span>
                            <div className="w-24 h-5 rounded-md bg-white/5 overflow-hidden">
                              <div className="h-full bg-red-500/50 rounded-md" style={{ width: `${(te.count / maxErr) * 100}%` }} />
                            </div>
                            <span className="shrink-0 text-[10px] text-red-400 font-bold w-6 text-right">{te.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <p className="mb-3 text-xs font-medium text-white/80">Top Error Endpoints</p>
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/40 mb-2" />
                        <p className="text-[10px] text-emerald-400/60">No error endpoints — all healthy</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Recent Error Logs ── */}
              <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                <p className="mb-3 text-xs font-medium text-white/80">Recent Error Logs</p>
                {apiMonitor.recentLogs.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400/30 mb-2" />
                      <p className="text-xs text-emerald-400/60">No errors recorded — all requests successful</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-white/5">
                      {apiMonitor.recentLogs.slice(apiLogsPage * 10, (apiLogsPage + 1) * 10).map(log => (
                        <div key={log.id} className="flex items-center gap-2 rounded-md bg-white/[0.02] px-3 py-2 border-b border-white/[0.02] last:border-0">
                          <span className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold w-12 text-center",
                            log.status_code < 400 ? "bg-yellow-500/10 text-yellow-400" :
                            log.status_code < 500 ? "bg-orange-500/10 text-orange-400" :
                            "bg-red-500/10 text-red-400"
                          )}>
                            {log.status_code}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground w-10">{log.method}</span>
                          <span className="flex-1 truncate text-xs text-white/80">{log.endpoint}</span>
                          {log.user_name && log.user_name !== "Anonymous" && (
                            <span className="hidden md:block shrink-0 text-[10px] text-blue-400/60 truncate max-w-[120px]">{log.user_name}</span>
                          )}
                          {log.error && <span className="hidden sm:block shrink-0 max-w-[200px] truncate text-[10px] text-red-400/60">{log.error}</span>}
                          <span className="shrink-0 text-[10px] text-muted-foreground">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                    {apiMonitor.recentLogs.length > 10 && (
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <button
                          onClick={() => setApiLogsPage(p => Math.max(0, p - 1))}
                          disabled={apiLogsPage === 0}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {apiLogsPage + 1} / {Math.ceil(apiMonitor.recentLogs.length / 10)}
                        </span>
                        <button
                          onClick={() => setApiLogsPage(p => Math.min(Math.ceil(apiMonitor.recentLogs.length / 10) - 1, p + 1))}
                          disabled={apiLogsPage >= Math.ceil(apiMonitor.recentLogs.length / 10) - 1}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Workspace & Seats */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-purple-400/60" />
            <h2 className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-widest">{t("adminWorkspaceSeats")}</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t("adminTotalWorkspaces"), value: stats?.totalWorkspaces ?? 0, sub: t("adminAllWorkspaces"), color: "text-blue-400" },
                { label: t("adminNewWorkspaces30d"), value: stats?.newWorkspaces30d ?? 0, sub: t("adminCreatedThisMonth"), color: "text-emerald-400" },
                { label: t("adminSeatsPerWorkspace"), value: stats?.seatsPerWorkspace ?? 0, sub: t("adminAvgTeamSize"), color: "text-purple-400" },
                { label: t("adminTotalActiveSeats"), value: stats?.totalActiveSeats ?? 0, sub: t("adminTeamPlanSeats"), color: "text-emerald-400" },
                { label: t("adminAvgSeatsPerTeam"), value: stats?.avgSeatsPerTeam ?? 0, sub: t("adminTeamPlanOnly"), color: "text-[#FFBF00]" },
                { label: t("adminNewSeats30d"), value: stats?.newSeats30d ?? 0, sub: t("adminMembersAddedThisMonth"), color: "text-emerald-400" },
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
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">{t("adminCompaniesWorkspaces")}</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{t("adminCompaniesDesc")}</p>

          {companiesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("adminNoCompanies")}</p>
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
                        <p className="px-2 py-2 text-xs text-muted-foreground">{t("adminNoWorkspaces")}</p>
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
                              <span className="shrink-0 text-xs text-muted-foreground">{ws.members.length} {ws.members.length !== 1 ? t("adminMembers") : t("adminMember")}</span>
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
            <h2 className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">{t("adminUserRoleManagement")}</h2>
          </div>
          <p className="mb-5 text-xs text-muted-foreground">{t("adminRoleDesc")}</p>
          <div className="space-y-5">
            <div>
              <Label htmlFor="roleEmail" className="text-sm font-medium text-white/80">{t("adminUserEmail")}</Label>
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
              <Label className="text-sm font-medium text-white/80">{t("adminAssignRole")}</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  { id: "user", label: t("adminRoleUser"), desc: t("adminRoleUserDesc"), icon: User, color: "text-white/60", active: "border-white/30 bg-white/5 text-white" },
                  { id: "manager", label: t("adminRoleManager"), desc: t("adminRoleManagerDesc"), icon: Users, color: "text-blue-400", active: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
                  { id: "admin", label: t("adminRoleAdmin"), desc: t("adminRoleAdminDesc"), icon: Shield, color: "text-emerald-400", active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
                  { id: "super_admin", label: t("adminRoleSuperAdmin"), desc: t("adminRoleSuperAdminDesc"), icon: ShieldCheck, color: "text-[#FFBF00]", active: "border-[#FFBF00]/40 bg-[#FFBF00]/10 text-[#FFBF00]" },
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
                  <span className="font-semibold">{t("adminSuperAdminWarning")}</span>{t("adminSuperAdminWarningDesc")}
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
                {t("adminUpdateRoleNotify")}
              </button>
            </div>
          </div>
        </div>

        {/* Trial Configuration */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">{t("adminTrialConfig")}</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{t("adminTrialDesc")}</p>
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <Label className="mb-2 block">{t("adminQuickPresets")}</Label>
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
                    {p.value} {t("adminDays")}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div>
              <Label htmlFor="trialDays">{t("adminCustomValue")}</Label>
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
                  = <span className="font-semibold text-foreground">{trialDays} {t("adminDaysFreeAccess")}</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveTrial}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:border-emerald-500/40 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("adminSaveTrial")}
            </button>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-purple-400/60" />
            <h2 className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-widest">{t("adminAnnouncementBanner")}</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{t("adminBannerDesc")}</p>
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
              <span className="text-sm select-none">{bannerEnabled ? t("adminBannerEnabled") : t("adminBannerDisabled")}</span>
            </label>
            <div>
              <Label htmlFor="bannerText">{t("adminMessage")}</Label>
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
              {t("adminSaveBanner")}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
