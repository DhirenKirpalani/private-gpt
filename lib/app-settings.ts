import { supabase } from "./supabase"

export type AnnouncementType = "info" | "feature" | "promo" | "warning"

export type AppSettings = {
  trial_days: number
  announcement_text: string
  announcement_enabled: string
  announcement_type: AnnouncementType
  announcement_link_url: string
  announcement_link_label: string
  token_limit_trial: number
  token_limit_solo: number
  token_limit_team: number
  token_limit_enterprise: number
  message_limit_trial: number
  message_limit_solo: number
  message_limit_team: number
  message_limit_enterprise: number
  show_usage_bar: boolean
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
    token_limit_trial: parseInt(settings.token_limit_trial || "50000", 10) || 50000,
    token_limit_solo: parseInt(settings.token_limit_solo || "500000", 10) || 500000,
    token_limit_team: parseInt(settings.token_limit_team || "2000000", 10) || 2000000,
    token_limit_enterprise: parseInt(settings.token_limit_enterprise || "10000000", 10) || 10000000,
    message_limit_trial: parseInt(settings.message_limit_trial || "20", 10) || 20,
    message_limit_solo: parseInt(settings.message_limit_solo || "50", 10) || 50,
    message_limit_team: parseInt(settings.message_limit_team || "200", 10) || 200,
    message_limit_enterprise: parseInt(settings.message_limit_enterprise || "1000", 10) || 1000,
    show_usage_bar: (settings.show_usage_bar ?? "true") !== "false",
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
