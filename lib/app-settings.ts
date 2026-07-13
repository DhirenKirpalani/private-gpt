import { supabase } from "./supabase"

export type AppSettings = {
  trial_days: number
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
