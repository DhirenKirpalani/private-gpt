import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Types ───
export interface ParsedTelegramMessage {
  chatId: string
  chatType?: string
  chatTitle?: string
  fromId?: string
  fromFirstName?: string
  fromLastName?: string
  fromUsername?: string
  tgMessageId: number
  text: string
  timestamp: string
}

// ─── Parse an incoming Telegram update into a normalized message ───
export function parseTelegramUpdate(update: any): ParsedTelegramMessage | null {
  const message = update.message || update.channel_post || update.edited_message
  if (!message) return null

  const chat = message.chat
  const from = message.from || message.sender_chat
  const text = message.text || message.caption || ""
  if (!text) return null

  return {
    chatId: String(chat.id),
    chatType: chat.type,
    chatTitle: chat.title || chat.first_name || chat.username || undefined,
    fromId: from ? String(from.id) : undefined,
    fromFirstName: from?.first_name,
    fromLastName: from?.last_name,
    fromUsername: from?.username,
    tgMessageId: message.message_id,
    text,
    timestamp: new Date(message.date * 1000).toISOString(),
  }
}

// ─── Format a Telegram sender's display name ───
export function formatTelegramSender(msg: any): string {
  if (msg.from_first_name || msg.from_last_name) {
    return [msg.from_first_name, msg.from_last_name].filter(Boolean).join(" ")
  }
  if (msg.from_username) return `@${msg.from_username}`
  if (msg.chat_title) return msg.chat_title
  return msg.from_id || msg.chat_id || "Unknown"
}

// ─── Insert a Telegram message into the DB (dedup by tg_message_id) ───
export async function insertTelegramMessage(
  userId: string,
  connectionId: string,
  parsed: ParsedTelegramMessage,
  direction: string = "received",
  read: boolean = false
): Promise<boolean> {
  // Check for duplicate
  const { data: existing } = await supabase
    .from("telegram_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("tg_message_id", parsed.tgMessageId)
    .single()

  if (existing) return false

  const { error } = await supabase.from("telegram_messages").insert({
    user_id: userId,
    connection_id: connectionId,
    direction,
    chat_id: parsed.chatId,
    chat_type: parsed.chatType || null,
    chat_title: parsed.chatTitle || null,
    from_id: parsed.fromId || null,
    from_first_name: parsed.fromFirstName || null,
    from_last_name: parsed.fromLastName || null,
    from_username: parsed.fromUsername || null,
    tg_message_id: parsed.tgMessageId,
    body: parsed.text,
    timestamp: parsed.timestamp,
    read,
  })

  if (error) console.error("[TG] Insert failed:", error.message)
  return !error
}

// ─── Fetch and store updates via getUpdates (returns count of new messages) ───
export async function fetchAndStoreUpdates(
  userId: string,
  connectionId: string,
  botToken: string
): Promise<number> {
  // Get last processed message_id for offset
  const { data: existingMsgs } = await supabase
    .from("telegram_messages")
    .select("tg_message_id")
    .eq("user_id", userId)
    .order("tg_message_id", { ascending: false })
    .limit(1)

  const offset = existingMsgs && existingMsgs.length > 0
    ? (existingMsgs[0].tg_message_id ?? 0) + 1
    : 0

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&limit=100&timeout=0`
  )
  const data = await res.json()
  if (!data.ok) return 0

  let imported = 0
  for (const update of data.result || []) {
    const parsed = parseTelegramUpdate(update)
    if (!parsed) continue
    const inserted = await insertTelegramMessage(userId, connectionId, parsed)
    if (inserted) imported++
  }

  return imported
}
