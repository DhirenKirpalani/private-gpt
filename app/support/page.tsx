"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, Send, CheckCircle, ImagePlus, X, Loader2, Lock } from "lucide-react"
import { useAuth } from "@/app/auth-provider"
import { useI18n } from "@/lib/i18n"
import { uploadSupportScreenshot } from "@/lib/supabase"

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || "")
      setEmail(user.email || "")
    }
  }, [user])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const newFiles = Array.from(selected).filter(f => f.type.startsWith("image/"))
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  if (authLoading || !user) {
    return (
      <div className="flex flex-col bg-background min-h-screen items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/10">
          <Lock className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("supportCheckingAccess")}</p>
      </div>
    )
  }

  function getSystemInfo() {
    const ua = navigator.userAgent
    const platform = (navigator as any).userAgentData?.platform || navigator.platform
    return {
      browser: ua,
      platform,
      screen: `${window.screen.width}x${window.screen.height}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    let imageUrls: string[] = []
    try {
      if (files.length > 0 && user) {
        imageUrls = await Promise.all(files.map(f => uploadSupportScreenshot(user.id, f)))
      }
    } catch (err: any) {
      console.error("Screenshot upload failed:", err)
    } finally {
      setUploading(false)
    }

    const sys = getSystemInfo()
    const subject = encodeURIComponent(`Help from ${name}`)
    const body = encodeURIComponent(
      `Name: ${name}\n` +
      `Email: ${email}\n\n` +
      `What happened?\n${message}\n\n` +
      `---\n` +
      `Browser: ${sys.browser}\n` +
      `Platform: ${sys.platform}\n` +
      `Screen: ${sys.screen}\n` +
      `Page: ${sys.url}\n` +
      (imageUrls.length > 0 ? `\nScreenshots:\n${imageUrls.join("\n")}` : "")
    )

    window.location.href = `mailto:support@exploro-os.com?subject=${subject}&body=${body}`
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex flex-1 flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/10 mx-auto">
              <Mail className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold">{t("supportNeedHelp")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("supportSubtitle")}
            </p>
            <a
              href="mailto:support@exploro-os.com"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              support@exploro-os.com
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("supportYourName")}</label>
              <input
                type="text"
                value={name}
                readOnly={!!user}
                onChange={e => setName(e.target.value)}
                required
                placeholder={t("supportPlaceholderName")}
                className="w-full rounded-xl border border-white/10 bg-[#2a3444] px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 read-only:opacity-60 read-only:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("supportYourEmail")}</label>
              <input
                type="email"
                value={email}
                readOnly={!!user}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={t("supportPlaceholderEmail")}
                className="w-full rounded-xl border border-white/10 bg-[#2a3444] px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 read-only:opacity-60 read-only:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("supportWhatHappened")}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                placeholder={t("supportPlaceholderMessage")}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#2a3444] px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Screenshots */}
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("supportScreenshots")}</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#2a3444] px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-white">
                <ImagePlus className="h-4 w-4" />
                <span>{t("supportClickToAdd")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-lg border border-white/10 overflow-hidden">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={sent || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("supportUploading")}
                </>
              ) : sent ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t("supportEmailOpened")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("supportSendToSupport")}
                </>
              )}
            </button>
          </form>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("supportBackToHome")}
          </Link>
        </div>
      </main>
    </div>
  )
}
