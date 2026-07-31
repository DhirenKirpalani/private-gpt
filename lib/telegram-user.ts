import { TelegramClient } from "teleproto"
import { StringSession } from "teleproto/sessions"
import { createAdminClient } from "@/lib/supabase"

export function createTelegramClient(sessionString?: string): TelegramClient {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0")
  const apiHash = process.env.TELEGRAM_API_HASH || ""
  const session = new StringSession(sessionString || "")
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  })
  return client
}

export async function getUserSession(userId: string): Promise<{ sessionString: string; phoneNumber: string } | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("telegram_user_sessions")
    .select("session_string, phone_number")
    .eq("user_id", userId)
    .eq("status", "connected")
    .single()
  if (error || !data) return null
  return { sessionString: data.session_string, phoneNumber: data.phone_number }
}

export async function saveUserSession(userId: string, phoneNumber: string, sessionString: string, tgUser?: any) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("telegram_user_sessions")
    .upsert({
      user_id: userId,
      phone_number: phoneNumber,
      session_string: sessionString,
      tg_user_id: tgUser?.id || null,
      tg_username: tgUser?.username || null,
      tg_first_name: tgUser?.first_name || null,
      tg_last_name: tgUser?.last_name || null,
      status: "connected",
    }, { onConflict: "user_id" })
  if (error) console.error("[TG USER] Failed to save session:", error.message)
}

export async function deleteUserSession(userId: string) {
  const supabase = createAdminClient()
  await supabase
    .from("telegram_user_sessions")
    .delete()
    .eq("user_id", userId)
}

export function isSessionExpiredError(err: any): boolean {
  const msg = err?.message || err?.errorMessage || ""
  return msg.includes("AuthKeyUnregistered") || msg.includes("AUTH_KEY_UNREGISTERED") || msg.includes("SESSION_REVOKED") || msg.includes("USER_DEACTIVATED")
}

export async function markSessionExpired(userId: string) {
  const supabase = createAdminClient()
  await supabase
    .from("telegram_user_sessions")
    .update({ status: "expired" })
    .eq("user_id", userId)
}
