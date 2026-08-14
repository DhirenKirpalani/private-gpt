"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, Users, Clock, TrendingUp, CreditCard, Megaphone, BarChart2, UserCog, ShieldCheck, Building2, ChevronDown, ChevronRight, Crown, Shield, User, AlertTriangle, Bell, Activity, Zap, CheckCircle2, XCircle, ChevronLeft, RefreshCw, MoreVertical, Download } from "lucide-react"
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
  wau: number
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
  // Token usage
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokensUsed: number
  tokenUsageByUser: Record<string, { prompt: number; completion: number; total: number }>
  // Investor metrics
  mrrByPlan: Record<string, number>
  netNewMrr: number
  expansionMrr: number
  quickRatio: number
  activationRate: number
  powerUsers: number
  funnelSignupToTrial: number
  funnelTrialToPaid: number
  funnelSignupToPaid: number
  tokenCost: number
  costPerToken: number
  revenuePerToken: number
  grossMargin: number
  // Cache stats
  totalCacheHitTokens: number
  cacheHitRate: number
  cacheSavings: number
  tokenCostWithoutCache: number
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
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [inlineActionUser, setInlineActionUser] = useState<string | null>(null)
  const [inlineActionLoading, setInlineActionLoading] = useState(false)
  const [bannerText, setBannerText] = useState("")
  const [bannerEnabled, setBannerEnabled] = useState(false)
  const [roleEmail, setRoleEmail] = useState("")
  const [roleTarget, setRoleTarget] = useState("admin")
  const [savingRole, setSavingRole] = useState(false)

  // Per-user trial override
  const [trialEmail, setTrialEmail] = useState("")
  const [trialUserDays, setTrialUserDays] = useState(15)
  const [savingUserTrial, setSavingUserTrial] = useState(false)
  const [emailCheck, setEmailCheck] = useState<{ loading: boolean; found: boolean | null; name: string | null }>({ loading: false, found: null, name: null })
  const [customTrialUsers, setCustomTrialUsers] = useState<{ userId: string; name: string; email: string; trialDays: number; subStatus: string | null; periodEnd: string | null }[]>([])
  const [customTrialsLoading, setCustomTrialsLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState<{ id: string; admin_email: string; action: string; target_email: string; old_value: string | null; new_value: string | null; created_at: string }[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPageLoading, setAuditPageLoading] = useState(false)
  const [auditPage, setAuditPage] = useState(0)
  const [auditTotal, setAuditTotal] = useState(0)
  const AUDIT_PAGE_SIZE = 10

  // Notification logs
  type NotificationRow = { id: string; userId: string; email: string; fullName: string; type: string; stage: string | null; daysLeft: number | null; plan: string | null; sentAt: string }
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Token & message limits
  const [tokenLimitTrial, setTokenLimitTrial] = useState(50000)
  const [tokenLimitSolo, setTokenLimitSolo] = useState(500000)
  const [tokenLimitTeam, setTokenLimitTeam] = useState(2000000)
  const [tokenLimitEnterprise, setTokenLimitEnterprise] = useState(10000000)
  const [messageLimitTrial, setMessageLimitTrial] = useState(20)
  const [messageLimitSolo, setMessageLimitSolo] = useState(50)
  const [messageLimitTeam, setMessageLimitTeam] = useState(200)
  const [messageLimitEnterprise, setMessageLimitEnterprise] = useState(1000)
  const [savingLimits, setSavingLimits] = useState(false)
  const [showUsageBarSetting, setShowUsageBarSetting] = useState(true)

  // Usage monitor
  type UserUsageRow = { userId: string; name: string; email: string; plan: string; status: string; periodStart: string; periodEnd: string | null; tokensUsed: number; tokenLimit: number; tokenPct: number; messagesUsedToday: number; messageLimit: number; msgPct: number }
  const [usageRows, setUsageRows] = useState<UserUsageRow[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState<{ userId: string; email: string; name: string } | null>(null)
  const [savingUsageBarToggle, setSavingUsageBarToggle] = useState(false)

  // Debounced email validation
  useEffect(() => {
    if (!trialEmail.trim() || !trialEmail.includes("@")) {
      setEmailCheck({ loading: false, found: null, name: null })
      return
    }
    setEmailCheck({ loading: true, found: null, name: null })
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lookup-user?email=${encodeURIComponent(trialEmail.trim().toLowerCase())}&requestingUserId=${user?.id || ""}`)
        const data = await res.json()
        if (res.ok && data.found) {
          setEmailCheck({ loading: false, found: true, name: data.name })
        } else {
          setEmailCheck({ loading: false, found: false, name: null })
        }
      } catch {
        setEmailCheck({ loading: false, found: false, name: null })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [trialEmail, user])

  // Load users with custom trial overrides
  async function loadCustomTrials() {
    if (!user) return
    setCustomTrialsLoading(true)
    try {
      const res = await fetch(`/api/admin/custom-trials?requestingUserId=${user.id}`)
      const data = await res.json()
      if (res.ok) setCustomTrialUsers(data.users ?? [])
    } catch {
      console.error("[ADMIN] Failed to load custom trials")
    } finally {
      setCustomTrialsLoading(false)
    }
  }

  async function loadAuditLogs(page?: number) {
    if (!user) return
    const p = page !== undefined ? page : auditPage
    const isPageChange = page !== undefined && auditLogs.length > 0
    if (isPageChange) setAuditPageLoading(true)
    else setAuditLoading(true)
    try {
      const offset = p * AUDIT_PAGE_SIZE
      const res = await fetch(`/api/admin/audit-log?requestingUserId=${user.id}&limit=${AUDIT_PAGE_SIZE}&offset=${offset}`)
      const data = await res.json()
      if (res.ok) {
        setAuditLogs(data.logs ?? [])
        setAuditTotal(data.total ?? 0)
      }
    } catch {
      console.error("[ADMIN] Failed to load audit logs")
    } finally {
      setAuditLoading(false)
      setAuditPageLoading(false)
    }
  }

  async function loadNotifications() {
    if (!user) return
    setNotificationsLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications?userId=${user.id}`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok) setNotifications(data.notifications ?? [])
    } catch {
      console.error("[ADMIN] Failed to load notifications")
    } finally {
      setNotificationsLoading(false)
    }
  }

  // API Monitoring
  type ApiLog = { id: string; method: string; endpoint: string; status_code: number; duration_ms: number | null; error: string | null; created_at: string; user_id: string | null; user_name: string; user_email: string }
  type ApiEndpointStat = { endpoint: string; total: number; success: number; errors: number; errorRate: number; avgDuration: number; p50: number; p95: number; p99: number; methods: { method: string; count: number }[]; lastCalled: string; peakHour: { hour: string; total: number } | null; hourlyTrend: { hour: string; total: number; errors: number; avgDuration: number }[] }
  type ApiHourly = { hour: string; total: number; errors: number; success: number; avgDuration: number; errorRate: number }
  type ApiUserStat = { userId: string; name: string; email: string; total: number; success: number; errors: number; errorRate: number; avgDuration: number }
  type ApiMethodStat = { method: string; total: number; success: number; errors: number; errorRate: number }
  type ApiMonitorData = {
    total: number; successCount: number; errorCount: number; successRate: number; errorRate: number; avgDuration: number
    p50: number; p95: number; p99: number; methods: ApiMethodStat[]
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "api" | "settings">("dashboard")
  const [filterUserId, setFilterUserId] = useState<string | null>(null)

  // Companies & workspaces
  type CompanyMember = { userId: string; email: string; fullName: string; role: string }
  type CompanyWorkspace = { id: string; name: string; icon: string; createdAt: string; members: CompanyMember[] }
  type ChannelInfo = { provider: string; label: string; status: string; detail: string; connectedAt: string | null }
  type Company = { userId: string; email: string; fullName: string; jobTitle: string; companyName: string; platformRole: string; createdAt: string | null; lastSignIn: string | null; subStatus: string | null; subPlan: string | null; trialEnd: string | null; trialDaysRemaining: number | null; channels: ChannelInfo[]; workspaces: CompanyWorkspace[] }
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [expandedWs, setExpandedWs] = useState<string | null>(null)
  const [companySearch, setCompanySearch] = useState("")
  const [companyFilterStatus, setCompanyFilterStatus] = useState<string>("all")
  const [companyFilterPlan, setCompanyFilterPlan] = useState<string>("all")
  const [companyPage, setCompanyPage] = useState(0)
  const COMPANY_PAGE_SIZE = 10
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false)

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
        setTokenLimitTrial(settings.token_limit_trial)
        setTokenLimitSolo(settings.token_limit_solo)
        setTokenLimitTeam(settings.token_limit_team)
        setTokenLimitEnterprise(settings.token_limit_enterprise)
        setMessageLimitTrial(settings.message_limit_trial)
        setMessageLimitSolo(settings.message_limit_solo)
        setMessageLimitTeam(settings.message_limit_team)
        setMessageLimitEnterprise(settings.message_limit_enterprise)
        setShowUsageBarSetting(settings.show_usage_bar !== false)
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load settings", variant: "error" })
      } finally {
        setSettingsLoading(false)
      }
    }

    async function loadStats() {
      try {
        const res = await fetch(`/api/admin/stats?userId=${user!.id}`, { cache: "no-store" })
        const data = await res.json()
        if (res.ok) {
          setStats(data)
          setLastUpdated(new Date())
        }
      } catch {
      } finally {
        setStatsLoading(false)
      }
    }

    load()
    loadStats()
    loadCompanies()
    loadApiMonitor()
    loadCustomTrials()
    loadAuditLogs()
    loadNotifications()
    loadUsageMonitor()

    // Auto-refresh every 30 seconds
    const intervals: ReturnType<typeof setInterval>[] = []
    if (autoRefresh) {
      intervals.push(setInterval(() => loadStats(), 30000))
    }
    intervals.push(setInterval(() => loadAuditLogs(), 30000))
    intervals.push(setInterval(() => loadNotifications(), 30000))
    intervals.push(setInterval(() => loadUsageMonitor(), 30000))
    return () => intervals.forEach(clearInterval)
  }, [user, role, loading, router, autoRefresh])

  async function loadApiMonitor(range?: string, uid?: string | null) {
    try {
      const r = range || apiMonitorRange
      const f = uid !== undefined ? uid : filterUserId
      const url = `/api/admin/api-monitoring?userId=${user!.id}&range=${r}${f ? `&filterUserId=${f}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setApiMonitor(data)
    } catch {
      console.error("[ADMIN] Failed to load API monitoring data")
    } finally {
      setApiMonitorLoading(false)
    }
  }

  useEffect(() => {
    if (user && role === "super_admin") loadApiMonitor(apiMonitorRange, filterUserId)
  }, [apiMonitorRange, filterUserId])

  // Auto-refresh API monitoring every 30 seconds
  useEffect(() => {
    if (!user || role !== "super_admin") return
    const interval = setInterval(() => {
      loadApiMonitor(apiMonitorRange, filterUserId)
    }, 30000)
    return () => clearInterval(interval)
  }, [user, role, apiMonitorRange, filterUserId])

  // Auto-refresh companies & workspaces every 30 seconds
  useEffect(() => {
    if (!user || role !== "super_admin") return
    const interval = setInterval(() => {
      loadCompanies()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, role])


  // Filtered companies
  const filteredCompanies = companies.filter(c => {
    if (companySearch.trim()) {
      const q = companySearch.toLowerCase()
      const matches = (c.companyName?.toLowerCase().includes(q) ||
        c.fullName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q))
      if (!matches) return false
    }
    if (companyFilterStatus !== "all" && c.subStatus !== companyFilterStatus) return false
    if (companyFilterPlan !== "all" && c.subPlan !== companyFilterPlan) return false
    return true
  })

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

  const handleSaveLimits = async () => {
    if (!user) return
    setSavingLimits(true)
    try {
      const res = await fetch("/api/admin/update-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestingUserId: user.id,
          tokenLimitTrial, tokenLimitSolo, tokenLimitTeam, tokenLimitEnterprise,
          messageLimitTrial, messageLimitSolo, messageLimitTeam, messageLimitEnterprise,
          showUsageBar: showUsageBarSetting,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      toast({ title: "Saved", description: "Token & message limits updated." })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "error" })
    } finally {
      setSavingLimits(false)
    }
  }

  const handleToggleUsageBar = async () => {
    if (!user) return
    const next = !showUsageBarSetting
    setShowUsageBarSetting(next)
    setSavingUsageBarToggle(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestingUserId: user.id,
          settings: { show_usage_bar: next ? "true" : "false" },
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: next ? "Usage bar enabled" : "Usage bar hidden", description: next ? "Users will see the usage bar in chat." : "Usage bar is now hidden from chat." })
    } catch {
      setShowUsageBarSetting(!next) // revert
      toast({ title: "Error", description: "Failed to save setting", variant: "error" })
    } finally {
      setSavingUsageBarToggle(false)
    }
  }

  const loadUsageMonitor = async () => {
    if (!user) return
    setUsageLoading(true)
    try {
      const res = await fetch(`/api/admin/user-usage?userId=${user.id}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setUsageRows(data.users || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load usage", variant: "error" })
    } finally {
      setUsageLoading(false)
    }
  }

  const handleResetUsage = async (targetUserId: string, targetEmail: string) => {
    if (!user) return
    setResettingUserId(targetUserId)
    try {
      const res = await fetch("/api/admin/reset-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestingUserId: user.id, targetUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reset")
      toast({ title: "Usage reset", description: "User's billing period has been reset to now." })
      await loadUsageMonitor()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reset", variant: "error" })
    } finally {
      setResettingUserId(null)
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

  const handleInlineAction = async (email: string, action: "trial7" | "trial15" | "trial30" | "roleAdmin" | "roleUser") => {
    if (!user || !email) return
    setInlineActionLoading(true)
    try {
      if (action.startsWith("trial")) {
        const days = parseInt(action.replace("trial", ""))
        const res = await fetch("/api/admin/user-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestingUserId: user.id, targetUserEmail: email, trialDays: days }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed")
        toast({ title: "Trial updated", description: `${email} now has ${days} trial days.` })
        loadCustomTrials()
      } else if (action.startsWith("role")) {
        const newRole = action.replace("role", "").toLowerCase()
        const res = await fetch("/api/admin/set-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestingUserId: user.id, targetEmail: email, role: newRole }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed")
        toast({ title: "Role updated", description: `${email} is now ${newRole}.` })
      }
      setInlineActionUser(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Action failed", variant: "error" })
    } finally {
      setInlineActionLoading(false)
    }
  }

  const exportCSV = () => {
    if (!stats) return
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Report Date", new Date().toISOString()],
      [""],
      ["--- Platform ---", ""],
      ["Total Users", String(stats.totalUsers)],
      ["Active Trials", String(stats.activeTrials)],
      ["Expired Trials", String(stats.expiredTrials)],
      ["Active Subscriptions", String(stats.activeSubscriptions)],
      ["Canceled Subscriptions", String(stats.canceledSubscriptions)],
      [""],
      ["--- Revenue ---", ""],
      ["MRR", `$${stats.mrr}`],
      ["ARR", `$${stats.arr}`],
      ["ARPU", `$${stats.arpu}`],
      ["LTV", `$${stats.ltv}`],
      ["Net New MRR", `$${stats.netNewMrr}`],
      ["Expansion MRR", `$${stats.expansionMrr}`],
      ["Quick Ratio", String(stats.quickRatio)],
      ["Gross Margin", `${stats.grossMargin}%`],
      ["Conversion Rate", `${stats.conversionRate}%`],
      ["Churn Rate", `${stats.churnRate}%`],
      ["Revenue Churn Rate", `${stats.revenueChurnRate}%`],
      ["Net Revenue Retention", `${stats.netRevenueRetention}%`],
      ["MRR Growth Rate", `${stats.mrrGrowthRate}%`],
      ["New MRR This Month", `$${stats.newMrrThisMonth}`],
      [""],
      ["--- Usage & Engagement ---", ""],
      ["DAU", String(stats.dau)],
      ["WAU", String(stats.wau)],
      ["MAU", String(stats.mau)],
      ["Stickiness", `${stats.stickiness}%`],
      ["Activation Rate", `${stats.activationRate}%`],
      ["Power Users", String(stats.powerUsers)],
      ["Total Documents", String(stats.totalDocuments)],
      ["Total Chat Messages", String(stats.totalChatMessages)],
      ["Messages per User", String(stats.messagesPerUser)],
      [""],
      ["--- Token Usage ---", ""],
      ["Prompt Tokens", String(stats.totalPromptTokens)],
      ["Completion Tokens", String(stats.totalCompletionTokens)],
      ["Total Tokens", String(stats.totalTokensUsed)],
      ["AI Cost (est.)", `$${stats.tokenCost}`],
      ["AI Cost (without cache)", `$${stats.tokenCostWithoutCache}`],
      ["Cache Savings", `$${stats.cacheSavings}`],
      ["Cache Hit Rate", `${stats.cacheHitRate}%`],
      ["Cache Hit Tokens", String(stats.totalCacheHitTokens)],
      ["Cost per 1K Tokens", `$${stats.costPerToken.toFixed(4)}`],
      ["Revenue per 1K Tokens", `$${stats.revenuePerToken.toFixed(4)}`],
      [""],
      ["--- Funnel ---", ""],
      ["Signup → Trial", `${stats.funnelSignupToTrial}%`],
      ["Trial → Paid", `${stats.funnelTrialToPaid}%`],
      ["Signup → Paid", `${stats.funnelSignupToPaid}%`],
      [""],
      ["--- Growth ---", ""],
      ["User Growth Rate", `${stats.userGrowthRate}%`],
      ["Retention 30d", `${stats.retention30d}%`],
      [""],
      ["--- Workspace ---", ""],
      ["Total Workspaces", String(stats.totalWorkspaces)],
      ["Total Active Seats", String(stats.totalActiveSeats)],
      ["Avg Seats per Team", String(stats.avgSeatsPerTeam)],
      ["New Workspaces (30d)", String(stats.newWorkspaces30d)],
      ["New Seats (30d)", String(stats.newSeats30d)],
    ]

    // Add per-user token breakdown
    if (stats.tokenUsageByUser && Object.keys(stats.tokenUsageByUser).length > 0) {
      rows.push([""], ["--- Per-User Token Usage ---", ""])
      rows.push(["User ID", "Prompt Tokens", "Completion Tokens", "Total Tokens"])
      for (const [userId, usage] of Object.entries(stats.tokenUsageByUser).sort(([, a], [, b]) => b.total - a.total)) {
        rows.push([userId, String(usage.prompt), String(usage.completion), String(usage.total)])
      }
    }

    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `admin-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: "Report exported", description: "CSV downloaded successfully." })
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

      {/* Reset Usage Confirmation Modal */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResetConfirm(null)} />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#151b27] p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#FFBF00]/20 bg-[#FFBF00]/10">
              <RefreshCw className="h-5 w-5 text-[#FFBF00]" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">Reset token usage?</h3>
            <p className="mb-1 text-sm font-medium text-white/80">{resetConfirm.name}</p>
            <p className="mb-4 text-xs text-muted-foreground">{resetConfirm.email}</p>
            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
              This moves their billing period start to <span className="text-white/70 font-medium">now</span>, effectively zeroing their token counter. The action is logged in the audit trail and <span className="text-white/70">cannot be undone</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetConfirm(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { userId, email } = resetConfirm
                  setResetConfirm(null)
                  await handleResetUsage(userId, email)
                }}
                disabled={resettingUserId === resetConfirm.userId}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
              >
                {resettingUserId === resetConfirm.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reset usage
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-[#1a1f2b] p-1.5">
          {([
            { id: "dashboard", label: "Dashboard", icon: BarChart2 },
            { id: "users", label: "Companies & Users", icon: Users },
            { id: "api", label: "API Monitoring", icon: Activity },
            { id: "settings", label: "Settings", icon: UserCog },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ───── Dashboard Tab ───── */}
        {activeTab === "dashboard" && (
          <>
        {/* Auto-refresh control */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
            {autoRefresh && lastUpdated && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={!stats}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors",
                autoRefresh ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground hover:text-white"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground")} />
              {autoRefresh ? "Auto-refresh (30s)" : "Paused"}
            </button>
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
                { label: "WAU", value: stats?.wau ?? 0, sub: "Active last 7 days", color: "text-blue-400" },
                { label: "MAU", value: stats?.mau ?? 0, sub: "Active last 30 days", color: "text-blue-400" },
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

        {/* Token Usage */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">Token Usage</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Prompt Tokens", value: (stats?.totalPromptTokens ?? 0).toLocaleString(), sub: "Total input tokens", color: "text-blue-400" },
                  { label: "Completion Tokens", value: (stats?.totalCompletionTokens ?? 0).toLocaleString(), sub: "Total output tokens", color: "text-emerald-400" },
                  { label: "Total Tokens", value: (stats?.totalTokensUsed ?? 0).toLocaleString(), sub: "All token usage", color: "text-[#FFBF00]" },
                  { label: "Avg / User", value: stats && stats.totalUsers > 0 ? Math.round((stats.totalTokensUsed ?? 0) / stats.totalUsers).toLocaleString() : "0", sub: "Tokens per registered user", color: "text-purple-400" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Per-user breakdown */}
              {stats?.tokenUsageByUser && Object.entries(stats.tokenUsageByUser).filter(([, u]) => u.total > 0).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Per-User Breakdown</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(stats.tokenUsageByUser)
                      .filter(([, u]) => u.total > 0)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([userId, usage]) => {
                        const company = companies.find(c => c.userId === userId)
                        const displayName = company ? (company.companyName || company.fullName || company.email) : userId.slice(0, 8) + "…"
                        const maxTotal = Math.max(...Object.values(stats.tokenUsageByUser).map(u => u.total).filter(t => t > 0))
                        const pct = maxTotal > 0 ? Math.round((usage.total / maxTotal) * 100) : 0
                        return (
                          <div key={userId} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-white/90">{displayName}</p>
                                <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div className="h-full rounded-full bg-[#FFBF00]/60" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs font-bold text-[#FFBF00]">{usage.total.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">{usage.prompt.toLocaleString()} in · {usage.completion.toLocaleString()} out</p>
                              </div>
                            </div>
                            {company && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                {company.email && company.email !== displayName && (
                                  <span className="truncate">{company.email}</span>
                                )}
                                {company.fullName && company.fullName !== displayName && (
                                  <span className="rounded bg-white/5 px-1.5 py-0.5">{company.fullName}</span>
                                )}
                                {company.subPlan && (
                                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400 capitalize">{company.subPlan}</span>
                                )}
                                {company.subStatus && (
                                  <span className={cn(
                                    "rounded px-1.5 py-0.5 capitalize",
                                    company.subStatus === "active" ? "bg-emerald-500/10 text-emerald-400" :
                                    company.subStatus === "trialing" ? "bg-[#FFBF00]/10 text-[#FFBF00]" :
                                    "bg-red-500/10 text-red-400"
                                  )}>{company.subStatus}</span>
                                )}
                                {company.platformRole && company.platformRole !== "user" && (
                                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400 capitalize">{company.platformRole}</span>
                                )}
                                {/* Inline actions */}
                                <div className="relative ml-auto">
                                  <button
                                    onClick={() => setInlineActionUser(inlineActionUser === userId ? null : userId)}
                                    disabled={inlineActionLoading}
                                    className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                                  >
                                    {inlineActionLoading && inlineActionUser === userId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-3 w-3" />
                                    )}
                                  </button>
                                  {inlineActionUser === userId && (
                                    <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-white/10 bg-[#1a1f2b] p-1 shadow-xl">
                                      <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Set Trial</p>
                                      {[
                                        { label: "7 days", action: "trial7" as const },
                                        { label: "15 days", action: "trial15" as const },
                                        { label: "30 days", action: "trial30" as const },
                                      ].map(opt => (
                                        <button
                                          key={opt.action}
                                          onClick={() => company.email && handleInlineAction(company.email, opt.action)}
                                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition-colors"
                                        >
                                          <Clock className="h-3 w-3 text-[#FFBF00]" />
                                          {opt.label}
                                        </button>
                                      ))}
                                      <div className="my-1 h-px bg-white/10" />
                                      <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Set Role</p>
                                      <button
                                        onClick={() => company.email && handleInlineAction(company.email, "roleAdmin")}
                                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition-colors"
                                      >
                                        <Shield className="h-3 w-3 text-blue-400" />
                                        Admin
                                      </button>
                                      <button
                                        onClick={() => company.email && handleInlineAction(company.email, "roleUser")}
                                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition-colors"
                                      >
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        User
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unit Economics */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Unit Economics</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Net New MRR", value: `${stats?.netNewMrr && stats.netNewMrr >= 0 ? "+" : ""}$${stats?.netNewMrr ?? 0}`, sub: "New + Expansion - Churn", color: (stats?.netNewMrr ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
                  { label: "Expansion MRR", value: `$${stats?.expansionMrr ?? 0}`, sub: "From upgrades this month", color: "text-emerald-400" },
                  { label: "Quick Ratio", value: stats?.quickRatio ?? 0, sub: "Growth efficiency (4+ is great)", color: (stats?.quickRatio ?? 0) >= 4 ? "text-emerald-400" : (stats?.quickRatio ?? 0) >= 2 ? "text-[#FFBF00]" : "text-red-400" },
                  { label: "Gross Margin", value: `${stats?.grossMargin ?? 100}%`, sub: "Revenue after AI costs", color: (stats?.grossMargin ?? 100) > 80 ? "text-emerald-400" : "text-[#FFBF00]" },
                  { label: "AI Cost / Month", value: `$${stats?.tokenCost ?? 0}`, sub: stats?.cacheSavings ? `Saved $${stats.cacheSavings} via cache` : "DeepSeek API spend", color: "text-muted-foreground" },
                  { label: "Cost / 1K Tokens", value: `$${(stats?.costPerToken ?? 0).toFixed(4)}`, sub: "Per 1K tokens used", color: "text-blue-400" },
                  { label: "Revenue / 1K Tokens", value: `$${(stats?.revenuePerToken ?? 0).toFixed(4)}`, sub: "MRR per 1K tokens", color: "text-emerald-400" },
                  { label: "Cache Hit Rate", value: `${stats?.cacheHitRate ?? 0}%`, sub: `${(stats?.totalCacheHitTokens ?? 0).toLocaleString()} cached tokens`, color: (stats?.cacheHitRate ?? 0) >= 50 ? "text-emerald-400" : (stats?.cacheHitRate ?? 0) > 0 ? "text-[#FFBF00]" : "text-muted-foreground" },
                  { label: "Cache Savings", value: (stats?.cacheSavings ?? 0) < 0.01 ? `$${(stats?.cacheSavings ?? 0).toFixed(4)}` : `$${stats?.cacheSavings ?? 0}`, sub: `vs $${stats?.tokenCostWithoutCache ?? 0} without cache`, color: "text-emerald-400" },
                  { label: "LTV:CAC", value: "—", sub: "Needs ad spend data", color: "text-muted-foreground" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className={cn("text-xl font-bold mt-0.5", m.color)}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>
              {stats?.mrrByPlan && Object.keys(stats.mrrByPlan).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">MRR by Plan</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.mrrByPlan).map(([plan, revenue]) => (
                      <span key={plan} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 capitalize">
                        {plan}: ${revenue}/mo
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trial → Paid Funnel */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">Trial → Paid Funnel</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Signups", value: stats?.totalUsers ?? 0, pct: 100, color: "bg-blue-500/60" },
                { label: "Started Trial", value: (stats?.activeTrials ?? 0) + (stats?.expiredTrials ?? 0) + (stats?.activeSubscriptions ?? 0), pct: stats?.funnelSignupToTrial ?? 0, color: "bg-[#FFBF00]/60" },
                { label: "Converted to Paid", value: stats?.activeSubscriptions ?? 0, pct: stats?.funnelSignupToPaid ?? 0, color: "bg-emerald-500/60" },
              ].map((stage, i) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/90">{stage.label}</span>
                    <span className="text-xs text-muted-foreground">{stage.value.toLocaleString()} ({stage.pct}%)</span>
                  </div>
                  <div className="h-7 rounded-lg bg-white/5 overflow-hidden">
                    <div className={cn("h-full rounded-lg flex items-center justify-end px-2 transition-all", stage.color)} style={{ width: `${Math.max(stage.pct, 2)}%` }}>
                      {stage.pct > 10 && <span className="text-[10px] font-bold text-white">{stage.pct}%</span>}
                    </div>
                  </div>
                  {i < 2 && (
                    <div className="flex items-center justify-between mt-1 mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {i === 0 ? `→ ${stats?.funnelSignupToTrial ?? 0}% start trial` : `→ ${stats?.funnelTrialToPaid ?? 0}% trial → paid`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Growth & Activation */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-blue-400/60" />
            <h2 className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-widest">Growth & Activation</h2>
          </div>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Activation Rate", value: `${stats?.activationRate ?? 0}%`, sub: "Signups who sent ≥1 message", color: (stats?.activationRate ?? 0) > 50 ? "text-emerald-400" : (stats?.activationRate ?? 0) > 25 ? "text-[#FFBF00]" : "text-red-400" },
                { label: "Power Users", value: stats?.powerUsers ?? 0, sub: "Users with ≥10 conversations", color: "text-purple-400" },
                { label: "User Growth", value: `${stats?.userGrowthRate ?? 0}%`, sub: "Last 30 days", color: "text-blue-400" },
                { label: "Retention 30d", value: `${stats?.retention30d ?? 0}%`, sub: "Users active after 30d", color: (stats?.retention30d ?? 0) > 50 ? "text-emerald-400" : "text-red-400" },
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
          </>
        )}

        {/* ───── API Monitoring Tab ───── */}
        {activeTab === "api" && (
          <>
        {/* API Monitoring */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">API Monitoring</h2>
                <p className="text-[10px] text-muted-foreground">Real-time API performance & health</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* LIVE badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-bold text-emerald-400 tracking-wide">LIVE</span>
              </div>
              {/* Time range pill selector */}
              <div className="flex items-center rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
                {(["24h", "7d", "30d"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setApiMonitorRange(r)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[11px] font-semibold transition-all",
                      apiMonitorRange === r
                        ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {/* Refresh button */}
              <button
                onClick={() => loadApiMonitor(apiMonitorRange)}
                className="group flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/20 transition-all"
                title="Refresh now"
              >
                <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-[10px] font-medium hidden sm:inline">Refresh</span>
              </button>
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
                    <div className="flex items-center gap-2 mt-1 text-[9px]">
                      <span className="text-emerald-400/70" title="p50 (median)">p50: {apiMonitor.p50}ms</span>
                      <span className="text-yellow-400/70" title="p95">p95: {apiMonitor.p95}ms</span>
                      <span className="text-red-400/70" title="p99">p99: {apiMonitor.p99}ms</span>
                    </div>
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

              {/* ── User Filter Banner ── */}
              {filterUserId && (
                <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-muted-foreground">Filtered by:</span>
                    <span className="font-medium text-white">
                      {filterUserId === "anonymous" ? "Anonymous" : (apiMonitor.topUsers.find(u => u.userId === filterUserId)?.name || "Unknown")}
                    </span>
                  </div>
                  <button
                    onClick={() => setFilterUserId(null)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <XCircle className="h-3 w-3" />
                    Clear filter
                  </button>
                </div>
              )}

              {/* ── Method Distribution ── */}
              {apiMonitor.methods && apiMonitor.methods.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Methods</span>
                  {apiMonitor.methods.map(m => (
                    <div key={m.method} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold",
                        m.method === "GET" ? "bg-blue-500/15 text-blue-400" :
                        m.method === "POST" ? "bg-emerald-500/15 text-emerald-400" :
                        m.method === "DELETE" ? "bg-red-500/15 text-red-400" :
                        m.method === "PUT" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-white/10 text-muted-foreground"
                      )}>{m.method}</span>
                      <span className="text-xs font-bold">{m.total}</span>
                      {m.errors > 0 && <span className="text-[9px] text-red-400">{m.errors} err</span>}
                    </div>
                  ))}
                </div>
              )}

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
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-medium text-white/80">Success Rate Trend</p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/50" />
                    </div>
                    <div className="relative h-28">
                      {(() => {
                        const pts = apiMonitor.successRateTrend
                        if (pts.length === 1) {
                          const pct = pts[0].successRate
                          const color = pct >= 95 ? "emerald" : pct >= 80 ? "yellow" : "red"
                          const hex = pct >= 95 ? "52,211,153" : pct >= 80 ? "250,204,21" : "239,68,68"
                          return (
                            <div className="flex flex-col justify-center h-full gap-3">
                              <div className="flex items-baseline gap-2">
                                <span className={cn("text-3xl font-bold", color === "emerald" ? "text-emerald-400" : color === "yellow" ? "text-yellow-400" : "text-red-400")}>{pct}%</span>
                                <span className="text-[10px] text-muted-foreground">success rate</span>
                              </div>
                              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(${hex},0.9) 0%, rgba(${hex},0.4) 100%)` }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-muted-foreground/60">
                                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                              </div>
                            </div>
                          )
                        }
                        const w = pts.length - 1
                        const points = pts.map((p, i) => `${i},${100 - p.successRate}`).join(" ")
                        return (
                          <div className="flex gap-2 h-full">
                            <div className="flex flex-col justify-between text-[8px] text-muted-foreground/40 py-0.5">
                              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                            </div>
                            <div className="flex-1 relative">
                              <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${w} 100`}>
                                <defs><linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.3)" /><stop offset="100%" stopColor="rgba(52,211,153,0)" /></linearGradient></defs>
                                {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                                <polygon points={`0,100 ${points} ${w},100`} fill="url(#sGrad)" />
                                <polyline points={points} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                {pts.map((p, i) => <circle key={i} cx={i} cy={100 - p.successRate} r="1.5" fill="rgb(52 211 153)" vectorEffect="non-scaling-stroke" />)}
                              </svg>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    {apiMonitor.successRateTrend.length > 1 && (
                      <div className="flex gap-2 mt-1.5 text-[8px] text-muted-foreground/50 border-t border-white/[0.03] pt-1.5">
                        <div className="w-7" />
                        <div className="flex-1 flex justify-between">
                          <span>{apiMonitor.successRateTrend[0]?.hour.slice(11, 16)}</span>
                          <span>{apiMonitor.successRateTrend[apiMonitor.successRateTrend.length - 1]?.hour.slice(11, 16)}</span>
                        </div>
                      </div>
                    )}
                    {apiMonitor.successRateTrend.length === 1 && (
                      <p className="text-[9px] text-muted-foreground/50 text-center mt-2">Line chart appears as more data points are collected</p>
                    )}
                  </div>
                )}
                {apiMonitor.durationTrend.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-medium text-white/80">Response Time Trend</p>
                      <Clock className="h-3.5 w-3.5 text-yellow-400/50" />
                    </div>
                    <div className="relative h-28">
                      {(() => {
                        const pts = apiMonitor.durationTrend
                        if (pts.length === 1) {
                          const ms = pts[0].avgDuration
                          const label = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
                          const color = ms < 1000 ? "emerald" : ms < 5000 ? "yellow" : "red"
                          const hex = ms < 1000 ? "52,211,153" : ms < 5000 ? "250,204,21" : "239,68,68"
                          const pct = Math.min((ms / 10000) * 100, 100)
                          return (
                            <div className="flex flex-col justify-center h-full gap-3">
                              <div className="flex items-baseline gap-2">
                                <span className={cn("text-3xl font-bold", color === "emerald" ? "text-emerald-400" : color === "yellow" ? "text-yellow-400" : "text-red-400")}>{label}</span>
                                <span className="text-[10px] text-muted-foreground">avg response</span>
                              </div>
                              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(${hex},0.9) 0%, rgba(${hex},0.4) 100%)` }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-muted-foreground/60">
                                <span>0ms</span><span>2.5s</span><span>5s</span><span>7.5s</span><span>10s+</span>
                              </div>
                            </div>
                          )
                        }
                        const maxDur = Math.max(...pts.map(d => d.avgDuration), 1)
                        const w = pts.length - 1
                        const points = pts.map((p, i) => `${i},${100 - (p.avgDuration / maxDur) * 100}`).join(" ")
                        const maxLabel = maxDur < 1000 ? `${maxDur}ms` : `${(maxDur / 1000).toFixed(1)}s`
                        const midLabel = maxDur < 1000 ? `${Math.round(maxDur / 2)}ms` : `${(maxDur / 2000).toFixed(1)}s`
                        return (
                          <div className="flex gap-2 h-full">
                            <div className="flex flex-col justify-between text-[8px] text-muted-foreground/40 py-0.5">
                              <span>{maxLabel}</span><span>{midLabel}</span><span>0ms</span>
                            </div>
                            <div className="flex-1 relative">
                              <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${w} 100`}>
                                <defs><linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(250,204,21,0.25)" /><stop offset="100%" stopColor="rgba(250,204,21,0)" /></linearGradient></defs>
                                {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
                                <polygon points={`0,100 ${points} ${w},100`} fill="url(#dGrad)" />
                                <polyline points={points} fill="none" stroke="rgb(250 204 21)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                {pts.map((p, i) => <circle key={i} cx={i} cy={100 - (p.avgDuration / maxDur) * 100} r="1.5" fill="rgb(250 204 21)" vectorEffect="non-scaling-stroke" />)}
                              </svg>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    {apiMonitor.durationTrend.length > 1 && (
                      <div className="flex gap-2 mt-1.5 text-[8px] text-muted-foreground/50 border-t border-white/[0.03] pt-1.5">
                        <div className="w-7" />
                        <div className="flex-1 flex justify-between">
                          <span>{apiMonitor.durationTrend[0]?.hour.slice(11, 16)}</span>
                          <span>{apiMonitor.durationTrend[apiMonitor.durationTrend.length - 1]?.hour.slice(11, 16)}</span>
                        </div>
                      </div>
                    )}
                    {apiMonitor.durationTrend.length === 1 && (
                      <p className="text-[9px] text-muted-foreground/50 text-center mt-2">Line chart appears as more data points are collected</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Endpoint Health Cards ── */}
              <div>
                <p className="mb-3 text-xs font-medium text-white/80">Endpoint Health</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {apiMonitor.endpoints.map(ep => {
                    const latencyColor = ep.avgDuration < 1000 ? "emerald" : ep.avgDuration < 5000 ? "yellow" : "red"
                    const latencyHex = ep.avgDuration < 1000 ? "rgb(52 211 153)" : ep.avgDuration < 5000 ? "rgb(250 204 21)" : "rgb(239 68 68)"
                    const latencyPct = Math.min((ep.avgDuration / 10000) * 100, 100)
                    const successPct = ep.total > 0 ? (ep.success / ep.total) * 100 : 100
                    return (
                      <div key={ep.endpoint} className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", ep.errorRate === 0 ? "bg-emerald-400" : ep.errorRate <= 10 ? "bg-yellow-400" : "bg-red-400")}>
                              <div className={cn("h-2 w-2 rounded-full animate-ping opacity-75", ep.errorRate === 0 ? "bg-emerald-400" : ep.errorRate <= 10 ? "bg-yellow-400" : "bg-red-400")} />
                            </div>
                            <span className="text-xs font-medium text-white truncate">{ep.endpoint}</span>
                          </div>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold", ep.errorRate === 0 ? "bg-emerald-500/10 text-emerald-400" : ep.errorRate <= 10 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                            {ep.errorRate === 0 ? "HEALTHY" : `${ep.errorRate}% ERR`}
                          </span>
                        </div>

                        {/* Latency gauge + stats */}
                        <div className="flex items-center gap-4 mb-4">
                          {/* Latency ring gauge */}
                          <div className="relative w-16 h-16 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                              <circle cx="32" cy="32" r="26" fill="none" stroke={latencyHex} strokeWidth="5"
                                strokeDasharray={`${(latencyPct / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26 - (latencyPct / 100) * 2 * Math.PI * 26}`}
                                strokeLinecap="round" className="transition-all duration-500" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={cn("text-sm font-bold", latencyColor === "emerald" ? "text-emerald-400" : latencyColor === "yellow" ? "text-yellow-400" : "text-red-400")}>
                                {ep.avgDuration < 1000 ? `${ep.avgDuration}` : `${(ep.avgDuration / 1000).toFixed(1)}s`}
                              </span>
                              <span className="text-[7px] text-muted-foreground">latency</span>
                            </div>
                          </div>

                          {/* Stat bars */}
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] text-muted-foreground">Requests</span>
                                <span className="text-xs font-bold">{ep.total}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500/50" style={{ width: `${Math.min((ep.total / Math.max(...apiMonitor.endpoints.map(e => e.total), 1)) * 100, 100)}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] text-muted-foreground">Success</span>
                                <span className="text-xs font-bold text-emerald-400">{successPct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${successPct}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] text-muted-foreground">Errors</span>
                                <span className="text-xs font-bold text-red-400">{ep.errors}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-red-500/50" style={{ width: `${ep.total > 0 ? (ep.errors / ep.total) * 100 : 0}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mini sparkline */}
                        {ep.hourlyTrend.length > 1 ? (
                          <div className="border-t border-white/[0.04] pt-3">
                            <div className="flex items-end gap-px h-8">
                              {(() => {
                                const maxT = Math.max(...ep.hourlyTrend.map(t => t.total), 1)
                                return ep.hourlyTrend.map((t, i) => (
                                  <div key={i} className="flex-1 rounded-sm transition-all hover:brightness-150" style={{ height: `${Math.max((t.total / maxT) * 100, 8)}%`, backgroundColor: t.errors > 0 ? "rgba(239,68,68,0.5)" : "rgba(52,211,153,0.4)", minWidth: 3 }} title={`${t.hour.slice(11, 16)}: ${t.total} req, ${t.errors} err, ${t.avgDuration}ms`} />
                                ))
                              })()}
                            </div>
                            <div className="flex justify-between mt-1 text-[8px] text-muted-foreground/50">
                              <span>{ep.hourlyTrend[0]?.hour.slice(11, 16)}</span>
                              <span>{ep.hourlyTrend[ep.hourlyTrend.length - 1]?.hour.slice(11, 16)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-white/[0.04] pt-3 flex items-center justify-center">
                            <span className="text-[9px] text-muted-foreground/40">Hourly trend appears with more data</span>
                          </div>
                        )}

                        {/* Method badges + percentiles */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1.5">
                            {ep.methods.map(m => (
                              <span key={m.method} className={cn(
                                "rounded px-1.5 py-0.5 text-[8px] font-bold",
                                m.method === "GET" ? "bg-blue-500/15 text-blue-400" :
                                m.method === "POST" ? "bg-emerald-500/15 text-emerald-400" :
                                m.method === "DELETE" ? "bg-red-500/15 text-red-400" :
                                m.method === "PUT" ? "bg-yellow-500/15 text-yellow-400" :
                                "bg-white/10 text-muted-foreground"
                              )}>{m.method}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-[8px] text-muted-foreground/60">
                            <span title="p50 (median)">p50 <span className="text-emerald-400/70 font-medium">{ep.p50}ms</span></span>
                            <span title="p95">p95 <span className="text-yellow-400/70 font-medium">{ep.p95}ms</span></span>
                            <span title="p99">p99 <span className="text-red-400/70 font-medium">{ep.p99}ms</span></span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Top Users by Request Volume ── */}
              {apiMonitor.topUsers && apiMonitor.topUsers.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium text-white/80">Top Users by Request Volume <span className="text-[9px] text-muted-foreground/50 ml-1">· click to filter</span></p>
                  <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                    <div className="space-y-2">
                      {apiMonitor.topUsers.map((u, i) => {
                        const maxTotal = Math.max(...apiMonitor.topUsers.map(t => t.total), 1)
                        const isActive = filterUserId === u.userId
                        return (
                          <button
                            key={u.userId}
                            onClick={() => setFilterUserId(isActive ? null : u.userId)}
                            className={cn(
                              "flex items-center gap-3 w-full rounded-lg p-1.5 -m-1.5 transition-colors text-left",
                              isActive ? "bg-blue-500/10 ring-1 ring-blue-500/30" : "hover:bg-white/[0.03]"
                            )}
                          >
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
                          </button>
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
          </>
        )}

        {/* ───── Companies & Users Tab ───── */}
        {activeTab === "users" && (
          <>
        {/* Companies & Workspaces */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-400/60" />
            <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">{t("adminCompaniesWorkspaces")}</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{t("adminCompaniesDesc")}</p>

          {/* Search & Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search by name, company, or email…"
                value={companySearch}
                onChange={(e) => { setCompanySearch(e.target.value); setCompanyPage(0) }}
                className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:border-emerald-500/40 focus:outline-none"
              />
              {/* Status Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setPlanDropdownOpen(false) }}
                  className="flex h-9 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white transition-colors hover:border-emerald-500/30 focus:outline-none min-w-[120px]"
                >
                  <span>{companyFilterStatus === "all" ? "All Status" : companyFilterStatus === "active" ? "Active" : companyFilterStatus === "trialing" ? "Trialing" : "Canceled"}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", statusDropdownOpen && "rotate-180")} />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[140px] rounded-lg border border-emerald-500/30 bg-[#1e2533] p-1 shadow-2xl shadow-black/40">
                    {[
                      { value: "all", label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "trialing", label: "Trialing" },
                      { value: "canceled", label: "Canceled" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setCompanyFilterStatus(opt.value); setCompanyPage(0); setStatusDropdownOpen(false) }}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-emerald-600/10 rounded-md",
                          companyFilterStatus === opt.value ? "text-emerald-400" : "text-white"
                        )}
                      >
                        {opt.label}
                        {companyFilterStatus === opt.value && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setPlanDropdownOpen(!planDropdownOpen); setStatusDropdownOpen(false) }}
                  className="flex h-9 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white transition-colors hover:border-emerald-500/30 focus:outline-none min-w-[120px]"
                >
                  <span>{companyFilterPlan === "all" ? "All Plans" : companyFilterPlan === "solo" ? "Solo" : companyFilterPlan === "team" ? "Team" : "Enterprise"}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", planDropdownOpen && "rotate-180")} />
                </button>
                {planDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[140px] rounded-lg border border-emerald-500/30 bg-[#1e2533] p-1 shadow-2xl shadow-black/40">
                    {[
                      { value: "all", label: "All Plans" },
                      { value: "solo", label: "Solo" },
                      { value: "team", label: "Team" },
                      { value: "enterprise", label: "Enterprise" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setCompanyFilterPlan(opt.value); setCompanyPage(0); setPlanDropdownOpen(false) }}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-emerald-600/10 rounded-md",
                          companyFilterPlan === opt.value ? "text-emerald-400" : "text-white"
                        )}
                      >
                        {opt.label}
                        {companyFilterPlan === opt.value && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(companySearch || companyFilterStatus !== "all" || companyFilterPlan !== "all") && (
                <button
                  onClick={() => { setCompanySearch(""); setCompanyFilterStatus("all"); setCompanyFilterPlan("all"); setCompanyPage(0) }}
                  className="text-[10px] text-muted-foreground hover:text-white"
                >
                  Clear filters
                </button>
              )}

            {/* Result count */}
            <p className="text-[10px] text-muted-foreground">
              Showing {Math.min(companyPage * COMPANY_PAGE_SIZE + 1, filteredCompanies.length)}-{Math.min((companyPage + 1) * COMPANY_PAGE_SIZE, filteredCompanies.length)} of {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
            </p>
          </div>

          {companiesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("adminLoading")}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{companies.length === 0 ? t("adminNoCompanies") : "No companies match your filters."}</p>
          ) : (
            <div className={cn("space-y-2 transition-opacity", companyPage > 0 && filteredCompanies.length > COMPANY_PAGE_SIZE && "")}>
              {filteredCompanies.slice(companyPage * COMPANY_PAGE_SIZE, (companyPage + 1) * COMPANY_PAGE_SIZE).map(c => {
                const displayName = c.companyName || c.fullName || c.email
                const initials = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                const isTrial = c.subStatus === "trialing"
                const isActive = c.subStatus === "active"
                const isCanceled = c.subStatus === "canceled"
                const isNoSub = !c.subStatus
                const trialUrgent = isTrial && c.trialDaysRemaining !== null && c.trialDaysRemaining <= 3
                return (
                <div key={c.userId} className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden transition-all hover:border-white/10">
                  {/* Company header row */}
                  <button
                    onClick={() => setExpandedCompany(expandedCompany === c.userId ? null : c.userId)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    {expandedCompany === c.userId
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    {/* Avatar circle */}
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      c.platformRole === "super_admin" ? "bg-[#FFBF00]/15 text-[#FFBF00]" :
                      c.platformRole === "admin" ? "bg-emerald-500/15 text-emerald-400" :
                      "bg-blue-500/15 text-blue-400"
                    )}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                        {c.workspaces.length > 0 && (
                          <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {c.workspaces.length} ws
                          </span>
                        )}
                        {c.channels.length > 0 && (
                          <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            {c.channels.length} ch
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {c.fullName && c.fullName !== displayName && c.fullName}{c.jobTitle && (c.fullName && c.fullName !== displayName) ? ` · ` : ``}{c.jobTitle}{(c.fullName !== displayName || c.jobTitle) ? ` · ` : ``}{c.email !== displayName ? c.email : ``}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {c.createdAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {isTrial && c.trialDaysRemaining !== null && (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            trialUrgent ? "bg-[#FFBF00]/20 text-[#FFBF00] ring-1 ring-[#FFBF00]/30" : "bg-emerald-500/10 text-emerald-400/90"
                          )}>
                            <Zap className="h-2.5 w-2.5" />
                            {c.trialDaysRemaining}d left · {(c.subPlan || "Solo").charAt(0).toUpperCase() + (c.subPlan || "Solo").slice(1)} Trial
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {(c.subPlan || "Solo").charAt(0).toUpperCase() + (c.subPlan || "Solo").slice(1)} · Active
                          </span>
                        )}
                        {isCanceled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            <XCircle className="h-2.5 w-2.5" />
                            Canceled
                          </span>
                        )}
                        {isNoSub && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {c.lastSignIn ? `Last login ${new Date(c.lastSignIn).toLocaleDateString()}` : "Never logged in"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                      c.platformRole === "super_admin" ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]" :
                      c.platformRole === "admin" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      c.platformRole === "manager" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" :
                      "border-white/10 text-muted-foreground"
                    )}>
                      {c.platformRole}
                    </span>
                  </button>

                  {/* Expanded: workspaces */}
                  {expandedCompany === c.userId && (
                    <div className="border-t border-white/5 p-3 space-y-2 bg-black/20">
                      {/* Connected Channels */}
                      {c.channels.length > 0 && (
                        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Connected Channels</p>
                          <div className="flex flex-wrap gap-2">
                            {c.channels.map((ch, idx) => (
                              <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
                                <span className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  ch.status === "connected" ? "bg-emerald-400" : "bg-orange-400"
                                )} />
                                <span className="text-xs font-medium text-white/90">{ch.label}</span>
                                {ch.detail && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{ch.detail}</span>
                                )}
                                {ch.connectedAt && (
                                  <span className="text-[10px] text-muted-foreground/60">
                                    {new Date(ch.connectedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {c.workspaces.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-muted-foreground text-center">{t("adminNoWorkspaces")}</p>
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
                              <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{ws.members.length} {ws.members.length !== 1 ? t("adminMembers") : t("adminMember")}</span>
                            </button>

                            {/* Expanded: members */}
                            {expandedWs === ws.id && (
                              <div className="border-t border-white/5 p-2 space-y-1">
                                {ws.members.map(m => {
                                  const mInitials = (m.fullName || m.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                                  return (
                                  <div key={m.userId} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-white/[0.02] transition-colors">
                                    <div className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                      m.role === "owner" ? "bg-[#FFBF00]/15 text-[#FFBF00]" :
                                      m.role === "admin" ? "bg-emerald-500/15 text-emerald-400" :
                                      "bg-blue-500/15 text-blue-400"
                                    )}>
                                      {mInitials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate text-xs font-medium text-white/90">{m.fullName || m.email}</p>
                                      <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
                                    </div>
                                    <span className={cn(
                                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                      m.role === "owner" ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]" :
                                      m.role === "admin" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                                      "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                    )}>
                                      {m.role}
                                    </span>
                                  </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
          {/* Companies Pagination */}
          {filteredCompanies.length > COMPANY_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setCompanyPage(p => Math.max(0, p - 1))}
                disabled={companyPage === 0}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {companyPage + 1} / {Math.ceil(filteredCompanies.length / COMPANY_PAGE_SIZE)}
              </span>
              <button
                onClick={() => setCompanyPage(p => Math.min(Math.ceil(filteredCompanies.length / COMPANY_PAGE_SIZE) - 1, p + 1))}
                disabled={companyPage >= Math.ceil(filteredCompanies.length / COMPANY_PAGE_SIZE) - 1}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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

        {/* Per-User Trial Override */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">Per-User Trial Override</h2>
          </div>
          <p className="mb-5 text-xs text-muted-foreground">Set a custom trial period for a specific user. This overrides the global default. Set to 0 or leave blank to use the global setting.</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trialEmail" className="text-sm font-medium text-white/80">User Email</Label>
              <div className="relative mt-1.5">
                <Input
                  id="trialEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={trialEmail}
                  onChange={(e) => setTrialEmail(e.target.value)}
                  className={cn(
                    "bg-white/[0.03] border-white/10 pr-10 transition-colors",
                    emailCheck.found === true && "border-emerald-500/40 bg-emerald-500/5",
                    emailCheck.found === false && "border-red-500/40 bg-red-500/5",
                  )}
                />
                {emailCheck.loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!emailCheck.loading && emailCheck.found === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                )}
                {!emailCheck.loading && emailCheck.found === false && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                )}
              </div>
              {emailCheck.found === true && emailCheck.name && (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    {emailCheck.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-emerald-300">{emailCheck.name}</span>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60">Verified</span>
                </div>
              )}
              {emailCheck.found === false && trialEmail.includes("@") && (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="text-xs font-medium text-red-300">No user found with this email</span>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="trialUserDays" className="text-sm font-medium text-white/80">Custom Trial Days</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <Input
                  id="trialUserDays"
                  type="number"
                  min={1}
                  max={365}
                  value={trialUserDays}
                  onChange={(e) => setTrialUserDays(parseInt(e.target.value, 10) || 0)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  = <span className="font-semibold text-foreground">{trialUserDays} days free access for this user</span>
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!user || !trialEmail.trim() || !trialUserDays) return
                setSavingUserTrial(true)
                try {
                  const res = await fetch("/api/admin/user-trial", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ requestingUserId: user.id, targetUserEmail: trialEmail.trim(), trialDays: trialUserDays }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || "Failed to update")
                  toast({ title: "Trial updated", description: `${trialEmail} now has ${trialUserDays} trial days.` })
                  setTrialEmail("")
                  loadCustomTrials()
                  loadAuditLogs()
                } catch (err: any) {
                  toast({ title: "Error", description: err.message || "Failed to update trial", variant: "error" })
                } finally {
                  setSavingUserTrial(false)
                }
              }}
              disabled={savingUserTrial || !trialEmail.trim() || !trialUserDays || emailCheck.found === false || emailCheck.loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FFBF00]/30 bg-[#FFBF00]/10 px-5 py-2.5 text-sm font-semibold text-[#FFBF00] transition-colors hover:bg-[#FFBF00]/15 hover:border-[#FFBF00]/40 disabled:opacity-50"
            >
              {savingUserTrial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Set Custom Trial
            </button>
          </div>
        </div>
          </>
        )}

        {/* ───── Settings Tab ───── */}
        {activeTab === "settings" && (
          <>
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

        {/* Token & Message Limits */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#FFBF00]/60" />
            <h2 className="text-[10px] font-semibold text-[#FFBF00]/60 uppercase tracking-widest">Token &amp; Message Limits</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Set how much AI usage each plan gets per month. Changes take effect immediately for all users on that plan.
          </p>
          {/* Context cards */}
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400">What is a token?</p>
              <p className="text-[11px] text-muted-foreground">1 token ≈ ¾ of an English word. A typical question + answer exchange uses <span className="font-medium text-white/70">150–600 tokens</span>. Longer &ldquo;Comprehensive&rdquo; responses can use up to <span className="font-medium text-white/70">10,000 tokens</span> per reply.</p>
            </div>
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Recommended values</p>
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                <li><span className="font-medium text-white/70">Trial:</span> 50K tokens · 20 msg/day</li>
                <li><span className="font-medium text-white/70">Solo:</span> 500K tokens · 50 msg/day</li>
                <li><span className="font-medium text-white/70">Team:</span> 2M tokens · 200 msg/day</li>
                <li><span className="font-medium text-white/70">Enterprise:</span> 10M tokens · 1,000 msg/day</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[#FFBF00]/10 bg-[#FFBF00]/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#FFBF00]">Auto-degradation at 80%</p>
              <p className="text-[11px] text-muted-foreground">When a user hits 80% of their token limit, response length is automatically halved (e.g. Standard: 6K → 3K tokens). This extends their quota rather than hard-blocking them.</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Token Limits */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white/80">Monthly Token Limits</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Trial", value: tokenLimitTrial, setter: setTokenLimitTrial, hint: "~85–330 exchanges/mo" },
                  { label: "Solo", value: tokenLimitSolo, setter: setTokenLimitSolo, hint: "~830–3,300 exchanges/mo" },
                  { label: "Team", value: tokenLimitTeam, setter: setTokenLimitTeam, hint: "~3,300–13,000 exchanges/mo" },
                  { label: "Enterprise", value: tokenLimitEnterprise, setter: setTokenLimitEnterprise, hint: "~16,000–66,000 exchanges/mo" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <Label className="text-xs text-muted-foreground">{item.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.value}
                      onChange={(e) => item.setter(parseInt(e.target.value, 10) || 0)}
                      className="mt-1"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">{(item.value || 0).toLocaleString()} tokens/mo</p>
                    <p className="text-[10px] text-blue-400/60">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Message Limits */}
            <div>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-white/80">Daily Message Limits</h3>
                <span className="text-[10px] text-muted-foreground">Hard cap — resets at midnight. Independent of token quota.</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Trial", value: messageLimitTrial, setter: setMessageLimitTrial, hint: "~600 msgs/mo at 20/day" },
                  { label: "Solo", value: messageLimitSolo, setter: setMessageLimitSolo, hint: "~1,550 msgs/mo at 50/day" },
                  { label: "Team", value: messageLimitTeam, setter: setMessageLimitTeam, hint: "~6,200 msgs/mo at 200/day" },
                  { label: "Enterprise", value: messageLimitEnterprise, setter: setMessageLimitEnterprise, hint: "~31,000 msgs/mo at 1,000/day" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <Label className="text-xs text-muted-foreground">{item.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.value}
                      onChange={(e) => item.setter(parseInt(e.target.value, 10) || 0)}
                      className="mt-1"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">{item.value} messages/day</p>
                    <p className="text-[10px] text-blue-400/60">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={handleSaveLimits}
                disabled={savingLimits}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/15 hover:border-emerald-500/40 disabled:opacity-50"
              >
                {savingLimits ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Limits
              </button>
              <button
                type="button"
                onClick={handleToggleUsageBar}
                disabled={savingUsageBarToggle}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04] disabled:opacity-60"
              >
                <span className="text-xs text-muted-foreground">Show usage bar in chat</span>
                {savingUsageBarToggle ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors ${
                    showUsageBarSetting ? "border-emerald-500/60 bg-emerald-500/20" : "border-white/10 bg-white/5"
                  }`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${
                      showUsageBarSetting ? "translate-x-4 bg-emerald-400" : "translate-x-0.5 bg-white/30"
                    }`} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Usage Monitor */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white/90">Usage Monitor</h2>
              <span className="text-[10px] text-muted-foreground">per-user token &amp; message usage this billing period</span>
            </div>
            <button
              onClick={loadUsageMonitor}
              disabled={usageLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
              title="Refresh now — also auto-refreshes every 30s"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", usageLoading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {usageRows.length === 0 && usageLoading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading usage data...
            </div>
          )}
          {usageRows.length === 0 && !usageLoading && (
            <p className="py-6 text-center text-xs text-muted-foreground">No subscription data found.</p>
          )}

          {usageRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Tokens</th>
                    <th className="pb-2 pr-4">Messages today</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usageRows.map(row => {
                    const isBlocked = row.tokenPct >= 100 || row.msgPct >= 100
                    const isAtRisk = !isBlocked && row.tokenPct >= 80
                    return (
                      <tr key={row.userId} className="group">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white/90 truncate max-w-[140px]">{row.name || "—"}</p>
                          <p className="text-muted-foreground truncate max-w-[140px]">{row.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize border
                            ${row.plan === "enterprise" ? "border-purple-500/30 bg-purple-500/10 text-purple-300" :
                              row.plan === "team" ? "border-blue-500/30 bg-blue-500/10 text-blue-300" :
                              row.plan === "solo" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
                              row.plan === "trial" ? "border-[#FFBF00]/30 bg-[#FFBF00]/10 text-[#FFBF00]" :
                              "border-white/10 bg-white/5 text-white/50"}`}>
                            {row.plan}
                          </span>
                        </td>
                        <td className="py-3 pr-4 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] font-semibold tabular-nums ${isBlocked ? "text-red-400" : isAtRisk ? "text-[#FFBF00]" : "text-white/80"}`}>
                              {row.tokenPct}%
                            </span>
                            {isBlocked && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">Blocked</span>}
                            {isAtRisk && <span className="rounded-full border border-[#FFBF00]/30 bg-[#FFBF00]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FFBF00]">At risk</span>}
                          </div>
                          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                                isBlocked ? "bg-gradient-to-r from-red-600 to-red-400" :
                                isAtRisk  ? "bg-gradient-to-r from-amber-500 to-[#FFBF00]" :
                                            "bg-gradient-to-r from-emerald-600 to-emerald-400"
                              }`}
                              style={{ width: `${Math.min(100, row.tokenPct)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                            {row.tokensUsed.toLocaleString()} <span className="text-white/20">/</span> {row.tokenLimit.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-medium ${row.msgPct >= 100 ? "text-red-400" : "text-white/70"}`}>
                            {row.messagesUsedToday} / {row.messageLimit}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => setResetConfirm({ userId: row.userId, email: row.email, name: row.name })}
                            disabled={resettingUserId === row.userId}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
                            title="Reset billing period to now — zeroes their token counter"
                          >
                            {resettingUserId === row.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Reset
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Email Notifications */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white/90">Email Notifications</h2>
              <span className="text-[10px] text-muted-foreground">auto-refreshes every 30s</span>
            </div>
            <button
              onClick={() => loadNotifications()}
              disabled={notificationsLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {notificationsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </button>
          </div>

          {notificationsLoading && notifications.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Recipient</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Stage</th>
                    <th className="pb-2 pr-4 font-medium">Days Left</th>
                    <th className="pb-2 pr-4 font-medium">Plan</th>
                    <th className="pb-2 font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map(n => (
                    <tr key={n.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-white/90">{n.fullName || n.email}</p>
                        {n.fullName && <p className="text-[10px] text-muted-foreground">{n.email}</p>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                          {n.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {n.stage && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                            n.stage === "final" ? "bg-red-500/10 text-red-400" :
                            n.stage === "urgent" ? "bg-[#FFBF00]/10 text-[#FFBF00]" :
                            "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {n.stage}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">
                        {n.daysLeft !== null ? `${n.daysLeft}d` : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground capitalize">
                        {n.plan || "—"}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(n.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="rounded-xl border border-white/5 bg-[#1a1f2b] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white/90">Audit Trail</h2>
              <span className="text-[10px] text-muted-foreground">auto-refreshes every 30s</span>
            </div>
            <button
              onClick={() => loadAuditLogs()}
              disabled={auditLoading}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", auditLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
          {auditLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No audit entries yet</p>
            </div>
          ) : (
            <div className={cn("relative space-y-3 pl-4 transition-opacity", auditPageLoading && "opacity-40 pointer-events-none")}>
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
              {auditLogs.map(log => {
                const dotColor =
                  log.action === "set_trial_override" ? "bg-[#FFBF00]" :
                  log.action === "remove_trial_override" ? "bg-white/40" :
                  log.action === "reset_usage" ? "bg-red-400" :
                  log.action === "set_role" ? "bg-purple-400" :
                  log.action === "update_limits" ? "bg-emerald-400" :
                  log.action === "update_settings" ? "bg-blue-400" :
                  "bg-white/20"

                const actionLabel = (() => {
                  switch (log.action) {
                    case "set_trial_override":
                      return <><span className="text-white/60">set trial to</span> <span className="font-semibold text-[#FFBF00]">{log.new_value} days</span> <span className="text-white/60">for</span> <span className="font-medium text-emerald-400">{log.target_email}</span></>
                    case "remove_trial_override":
                      return <><span className="text-white/60">removed trial override for</span> <span className="font-medium text-emerald-400">{log.target_email}</span></>
                    case "reset_usage":
                      return <><span className="text-white/60">reset token usage for</span> <span className="font-medium text-emerald-400">{log.target_email}</span></>
                    case "set_role": {
                      const oldR = log.old_value ?? "user"
                      const newR = log.new_value ?? "user"
                      return <><span className="text-white/60">changed role for</span> <span className="font-medium text-emerald-400">{log.target_email}</span> <span className="text-white/40">from</span> <span className="font-semibold text-white/70">{oldR}</span> <span className="text-white/40">→</span> <span className="font-semibold text-purple-400">{newR}</span></>
                    }
                    case "update_limits":
                      return <><span className="text-white/60">updated token &amp; message limits</span></>
                    case "update_settings": {
                      let keys = "settings"
                      try { keys = Object.keys(JSON.parse(log.new_value ?? "{}")).join(", ") } catch {}
                      return <><span className="text-white/60">changed app settings:</span> <span className="font-medium text-white/70">{keys}</span></>
                    }
                    default:
                      return <><span className="text-white/60">{log.action}</span></>
                  }
                })()

                return (
                  <div key={log.id} className="relative flex items-start gap-3">
                    <div className={cn("relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-[#1a1f2b]", dotColor)} />
                    <div className="min-w-0 flex-1 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
                      <p className="text-sm">
                        <span className="font-medium text-blue-400">{log.admin_email}</span>{" "}{actionLabel}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {log.old_value && log.action === "set_trial_override" && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5">was {log.old_value} days</span>
                        )}
                        <span className="ml-auto tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Audit Trail Pagination */}
          {auditTotal > AUDIT_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => { const p = Math.max(0, auditPage - 1); setAuditPage(p); loadAuditLogs(p) }}
                disabled={auditPage === 0 || auditLoading}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {auditPage + 1} / {Math.ceil(auditTotal / AUDIT_PAGE_SIZE)}
              </span>
              <button
                onClick={() => { const p = Math.min(Math.ceil(auditTotal / AUDIT_PAGE_SIZE) - 1, auditPage + 1); setAuditPage(p); loadAuditLogs(p) }}
                disabled={auditPage >= Math.ceil(auditTotal / AUDIT_PAGE_SIZE) - 1 || auditLoading}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
          </>
        )}

      </div>
    </div>
  )
}
