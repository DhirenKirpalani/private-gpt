import { supabase } from "./supabase"

export type AnnouncementType = "info" | "feature" | "promo" | "warning"

export type AppSettings = {
  trial_days: number
  announcement_text: string
  announcement_enabled: string
  announcement_type: AnnouncementType
  announcement_link_url: string
  announcement_link_label: string
}

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")

  if (error) throw error

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }

  return {
    trial_days: parseInt(settings.trial_days || "15", 10) || 15,
    announcement_text: settings.announcement_text ?? "",
    announcement_enabled: settings.announcement_enabled ?? "false",
    announcement_type: (settings.announcement_type as AnnouncementType) || "info",
    announcement_link_url: settings.announcement_link_url ?? "",
    announcement_link_label: settings.announcement_link_label ?? "",
  }
}

export async function getTrialDays(): Promise<number> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "trial_days")
    .single()

  if (error || !data) return 15
  return parseInt(data.value, 10) || 15
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })

  if (error) throw error
}
