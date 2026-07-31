import { TelegramClient } from "teleproto"
import { StringSession } from "teleproto/sessions"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

const API_ID = parseInt(process.env.TELEGRAM_API_ID || "0")
const API_HASH = process.env.TELEGRAM_API_HASH || ""

export function createTelegramClient(sessionString?: string): TelegramClient {
  const session = new StringSession(sessionString || "")
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  })
  return client
}

export async function getUserSession(userId: string): Promise<{ sessionString: string; phoneNumber: string } | null> {
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
  await supabase
    .from("telegram_user_sessions")
    .delete()
    .eq("user_id", userId)
}

export { supabase }
