import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cookie-based storage so middleware can read the session
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp("(^| )" + key + "=([^;]+)"))
    return match ? decodeURIComponent(match[2]) : null
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=604800; SameSite=Lax`
  },
  removeItem: (key: string): void => {
    if (typeof document === "undefined") return
    document.cookie = `${key}=; path=/; max-age=0`
  },
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    storageKey: "sb-auth-token",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Profile = {
  id: string
  user_id: string
  full_name: string
  job_title: string
  phone: string
  location: string
  company_name: string
  industry: string
  company_size: string
  year_founded: string
  website: string
  contact_email: string
  business_description: string
  target_audience: string
  key_products: string
  competitors: any
  ai_name: string
  ai_role: string
  brand_voice: string
  communication_style: string
  tone_examples: string
  words_to_avoid: string
  clarification_prompt: string
  response_length: string
  languages: any
  avatar_url: string
  role: "user" | "manager" | "admin" | "super_admin" | null
  logo_url: string
  brand_colors: any
  brand_style: string
  brand_mood: string
  input_style: string
  token_cap: number
  slogan: string
  doc_categories: any
  preferred_sources: any
  email_keywords: string[] | null
  created_at: string
  updated_at: string
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export async function upsertProfile(profile: Partial<Profile>) {
  console.log("[DEBUG upsertProfile] payload:", JSON.stringify(profile))
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single()

  if (error) {
    console.error("[DEBUG upsertProfile] ERROR:", error)
    console.error("[DEBUG upsertProfile] ERROR message:", error.message)
    console.error("[DEBUG upsertProfile] ERROR code:", error.code)
    console.error("[DEBUG upsertProfile] ERROR details:", error.details)
    throw error
  }
  console.log("[DEBUG upsertProfile] SUCCESS:", data)
  return data as Profile
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function signUp(email: string, password: string, fullName?: string) {
  const redirectTo = typeof window !== "undefined"
    ? `${window.location.origin}/login?confirmed=true`
    : undefined

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { full_name: fullName || "" },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return data.subscription
}

export async function resetPassword(email: string) {
  const origin = typeof window !== "undefined"
    ? window.location.origin
    : "https://exploro-os.com"
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Translations
export async function getTranslations(lang: string) {
  const { data, error } = await supabase
    .from("translations")
    .select("key, value")
    .eq("lang", lang)

  if (error) throw error

  const result: Partial<Record<string, string>> = {}
  data?.forEach((row: { key: string; value: string }) => {
    result[row.key] = row.value
  })
  return result
}

export async function upsertTranslation(key: string, lang: string, value: string) {
  const { error } = await supabase
    .from("translations")
    .upsert({ key, lang, value, updated_at: new Date().toISOString() }, { onConflict: "key,lang" })
  if (error) throw error
}

export async function publishTranslations(entries: { key: string; lang: string; value: string }[]) {
  const { error } = await supabase
    .from("translations")
    .upsert(
      entries.map(e => ({ ...e, updated_at: new Date().toISOString() })),
      { onConflict: "key,lang" }
    )
  if (error) throw error
}

// Avatars
export async function uploadLogo(userId: string, file: File) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error("No active session. Please sign in again.")

  const fileExt = file.name.split(".").pop()
  const filePath = `${userId}/logo.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("logos").getPublicUrl(filePath)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function uploadAvatar(userId: string, file: File) {
  console.log("[DEBUG uploadAvatar] START userId:", userId, "file:", file.name, "type:", file.type, "size:", file.size)

  // Verify session is active before upload
  const { data: sessionData } = await supabase.auth.getSession()
  console.log("[DEBUG uploadAvatar] session:", sessionData.session ? "present" : "MISSING")
  if (!sessionData.session) {
    throw new Error("No active session. Please sign in again.")
  }
  console.log("[DEBUG uploadAvatar] auth.uid from session:", sessionData.session.user.id)
  if (sessionData.session.user.id !== userId) {
    console.warn("[DEBUG uploadAvatar] WARNING: session userId != passed userId")
  }

  const fileExt = file.name.split(".").pop()
  const filePath = `${userId}/avatar.${fileExt}`
  console.log("[DEBUG uploadAvatar] filePath:", filePath)

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error("[DEBUG uploadAvatar] STORAGE UPLOAD FAILED:", uploadError)
    console.error("[DEBUG uploadAvatar] error.name:", (uploadError as any).name)
    console.error("[DEBUG uploadAvatar] error.statusCode:", (uploadError as any).statusCode)
    throw uploadError
  }
  console.log("[DEBUG uploadAvatar] Storage upload OK")

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`
  console.log("[DEBUG uploadAvatar] publicUrl:", publicUrl)
  return publicUrl
}

// Knowledge Base
export async function uploadDocument(
  userId: string,
  file: File,
  category: string,
  pageCount: number = 0,
  workspaceId?: string
) {
  const documentId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = `${userId}/${documentId}_${safeName}`

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(filePath, file, { upsert: false, contentType: file.type })

  if (uploadError) throw uploadError

  // 2. Insert documents row
  const { data, error: dbError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: userId,
      category,
      filename: `${documentId}_${safeName}`,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      status: "INDEXED",
      page_count: pageCount,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    })
    .select()
    .single()

  if (dbError) throw dbError
  return data
}

export async function archiveExpiredFile(userId: string, filename: string) {
  const { error } = await supabase.storage
    .from("knowledge-base")
    .remove([`${userId}/${filename}`])
  if (error) console.error("[archiveExpiredFile] Storage delete failed:", error.message)
  return !error
}

export async function lazyArchiveDocuments(userId: string) {
  const now = new Date().toISOString()
  const { data: expired, error } = await supabase
    .from("documents")
    .select("id, filename, pinned, expires_at, file_archived")
    .eq("user_id", userId)
    .eq("file_archived", false)
    .lt("expires_at", now)

  if (error) {
    console.error("[lazyArchive] Query failed:", error.message)
    return
  }

  if (!expired || expired.length === 0) return

  for (const doc of expired) {
    if (doc.pinned) continue
    await archiveExpiredFile(userId, doc.filename)
    await supabase
      .from("documents")
      .update({ file_archived: true })
      .eq("id", doc.id)
  }
}

export async function fetchUserDocuments(userId: string, workspaceId?: string) {
  await lazyArchiveDocuments(userId)

  let query = supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (workspaceId) query = query.eq("workspace_id", workspaceId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Categories
export async function fetchUserCategories(userId: string, workspaceId?: string) {
  let query = supabase
    .from("knowledge_categories")
    .select("id, name")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })

  if (workspaceId) {
    // Include both workspace-specific categories AND legacy categories with no workspace_id
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function insertCategory(userId: string, name: string, workspaceId?: string) {
  const { data, error } = await supabase
    .from("knowledge_categories")
    .insert({ user_id: userId, name, ...(workspaceId ? { workspace_id: workspaceId } : {}) })
    .select("id, name")
    .single()

  if (error) throw error
  return data as { id: string; name: string }
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from("knowledge_categories")
    .delete()
    .eq("id", categoryId)

  if (error) throw error
}

export async function deleteDocument(documentId: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)

  if (error) throw error
}

export async function updateDocumentText(documentId: string, parsedText: string) {
  const { error } = await supabase
    .from("documents")
    .update({ parsed_text: parsedText, status: "INDEXED" })
    .eq("id", documentId)
  if (error) throw error
}

export async function fetchDocumentContents(userId: string, workspaceId?: string) {
  let query = supabase
    .from("documents")
    .select("id, original_filename, category, parsed_text")
    .eq("user_id", userId)
    .not("parsed_text", "is", null)
    .order("created_at", { ascending: false })

  if (workspaceId) query = query.eq("workspace_id", workspaceId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as { id: string; original_filename: string; category: string; parsed_text: string }[]
}

export async function pinDocument(documentId: string, pinned: boolean) {
  const { error } = await supabase
    .from("documents")
    .update({ pinned, expires_at: pinned ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
    .eq("id", documentId)
  if (error) throw error
}

export async function extendDocumentExpiry(documentId: string) {
  const { error } = await supabase
    .from("documents")
    .update({
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      extended_at: new Date().toISOString(),
    })
    .eq("id", documentId)
  if (error) throw error
}

export function getDocumentPublicUrl(userId: string, filename: string) {
  const { data } = supabase.storage.from("knowledge-base").getPublicUrl(`${userId}/${filename}`)
  return data.publicUrl
}

// Email connections
export type EmailConnection = {
  id: string
  user_id: string
  provider: string
  email_address: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean
  smtp_user: string | null
  smtp_pass: string | null
  imap_host: string | null
  imap_port: number | null
  status: string
  last_error: string | null
  created_at: string
  updated_at: string
}

export async function getEmailConnections(userId: string): Promise<EmailConnection[]> {
  const { data, error } = await supabase
    .from("email_connections")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as EmailConnection[]
}

export async function saveEmailConnection(conn: Partial<EmailConnection>): Promise<EmailConnection> {
  const { data, error } = await supabase
    .from("email_connections")
    .upsert(conn, { onConflict: "user_id,provider" })
    .select()
    .single()
  if (error) throw error
  return data as EmailConnection
}

export async function deleteEmailConnection(userId: string, provider: string): Promise<void> {
  // Delete associated email messages first
  const { error: msgError } = await supabase
    .from("email_messages")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider)
  if (msgError) console.error("[deleteEmailConnection] Failed to delete messages:", msgError.message)

  // Then delete the connection
  const { error } = await supabase
    .from("email_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider)
  if (error) throw error
}

// Chat history
export type ChatConversation = {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  sources?: string[] | null
  created_at: string
}

export async function getConversations(userId: string, workspaceId?: string): Promise<ChatConversation[]> {
  let query = supabase
    .from("chat_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (workspaceId) query = query.eq("workspace_id", workspaceId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ChatConversation[]
}

export async function createConversation(userId: string, title?: string, workspaceId?: string): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ user_id: userId, title: title || null, ...(workspaceId ? { workspace_id: workspaceId } : {}) })
    .select()
    .single()
  if (error) throw error
  return data as ChatConversation
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("chat_conversations")
    .update({ title })
    .eq("id", conversationId)
  if (error) throw error
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId)
  if (error) throw error
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sources?: string[],
  tokenUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cache_hit_tokens?: number }
): Promise<ChatMessage> {
  const payload: Record<string, any> = { conversation_id: conversationId, role, content }
  if (sources && sources.length > 0) payload.sources = sources
  if (tokenUsage) {
    payload.prompt_tokens = tokenUsage.prompt_tokens
    payload.completion_tokens = tokenUsage.completion_tokens
    payload.total_tokens = tokenUsage.total_tokens
    if (tokenUsage.cache_hit_tokens) payload.cache_hit_tokens = tokenUsage.cache_hit_tokens
  }
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as ChatMessage
}

export async function updateMessageContent(messageId: string, content: string): Promise<void> {
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ content })
    .eq("id", messageId)
    .select("id")
  if (error) throw error
  if (!data || data.length === 0) throw new Error("No rows updated — message ID not found in DB")
}

export async function deleteMessagesAfter(conversationId: string, afterCreatedAt: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("conversation_id", conversationId)
    .gte("created_at", afterCreatedAt)
  if (error) console.error("[deleteMessagesAfter] Failed:", error.message)
}

// Email messages
export type EmailMessage = {
  id: string
  user_id: string
  connection_id: string
  provider: string
  direction: "sent" | "received"
  from_address: string | null
  to_address: string | null
  subject: string | null
  body: string | null
  html_body?: string | null
  message_id?: string | null
  thread_id?: string | null
  read?: boolean
  sent_at?: string
  received_at?: string
  created_at: string
}

export async function markEmailAsRead(userId: string, messageId: string) {
  const { error } = await supabase
    .from("email_messages")
    .update({ read: true })
    .eq("id", messageId)
    .eq("user_id", userId)
  if (error) throw error
}

export async function getEmailMessages(userId: string, direction?: "sent" | "received"): Promise<EmailMessage[]> {
  let query = supabase
    .from("email_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (direction) query = query.eq("direction", direction)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EmailMessage[]
}

export async function deleteEmailMessagesByIds(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase.from("email_messages").delete().eq("user_id", userId).in("id", ids)
  if (error) console.error("[deleteEmailMessagesByIds]", error.message)
}

export async function saveEmailMessage(msg: Partial<EmailMessage>): Promise<EmailMessage> {
  const { data, error } = await supabase
    .from("email_messages")
    .insert(msg)
    .select()
    .single()
  if (error) throw error
  return data as EmailMessage
}

// ─── Contacts ───
export interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  company: string | null
  role: string | null
  phone: string | null
  location: string | null
  tags: string[]
  starred: boolean
  source: string
  last_contact: string | null
  deal_value: number
  deal_stage: string | null
  created_at: string
  updated_at: string
}

export async function getContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data || []) as Contact[]
}

export async function saveContact(contact: Partial<Contact> & { user_id: string }): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .upsert(contact, { onConflict: "user_id,email" })
    .select()
    .single()
  if (error) throw error
  return data as Contact
}

export async function deleteContact(userId: string, contactId: string) {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", userId)
  if (error) throw error
}

// Import contacts from email messages (extract unique senders + parse body for contact info)
export async function importContactsFromEmails(userId: string): Promise<number> {
  console.log("[IMPORT DEBUG] Starting import for user:", userId)

  // Get user's own email addresses to exclude from import
  const { data: userConns } = await supabase
    .from("email_connections")
    .select("email_address, smtp_user, email_account")
    .eq("user_id", userId)
  const ownEmails = new Set<string>()
  for (const c of userConns || []) {
    if (c.email_address) ownEmails.add(c.email_address.toLowerCase())
    if (c.smtp_user) ownEmails.add(c.smtp_user.toLowerCase())
    if (c.email_account) ownEmails.add(c.email_account.toLowerCase())
  }

  // Get all received email messages for this user — include body for signature parsing
  const { data: messages, error } = await supabase
    .from("email_messages")
    .select("from_address, subject, received_at, body")
    .eq("user_id", userId)
    .eq("direction", "received")
    .not("from_address", "is", null)

  console.log("[IMPORT DEBUG] Messages query result:", { count: messages?.length || 0, error: error?.message || null })
  if (error || !messages || messages.length === 0) {
    console.log("[IMPORT DEBUG] No messages found, returning 0")
    return 0
  }

  // Extract contact info from email body (signature parsing)
  function parseSignatureInfo(body: string) {
    const info: { name?: string; phone?: string; company?: string; location?: string; linkedin?: string } = {}
    if (!body) return info

    // Strip HTML tags for cleaner parsing
    let text = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")

    // Strip quoted reply content — only parse the sender's actual message, not the quoted original
    // Gmail style: "On Mon, Jan 1, 2024 at 10:00 AM, John <john@email.com> wrote:"
    text = text.replace(/\bOn\s+[\s\S]+?\bwrote:[\s\S]*$/i, "")
    // Outlook style: "From: John Doe [mailto:john@email.com]"
    text = text.replace(/\bFrom:\s+[\s\S]+?\bSent:\s+[\s\S]*$/i, "")
    text = text.replace(/\bFrom:\s+[\s\S]*$/i, "")
    // Generic: "--- Original Message ---"
    text = text.replace(/-{2,}\s*Original\s+Message\s*-{2,}[\s\S]*$/i, "")
    // Generic: "--- Forwarded Message ---"
    text = text.replace(/-{2,}\s*Forwarded\s+Message\s*-{2,}[\s\S]*$/i, "")
    // Gmail quote blocks in HTML (already stripped tags, but check for > prefixes)
    text = text.replace(/^>.*$/gm, "")
    // Trailing whitespace
    text = text.trim()

    // Name: look for sign-off patterns like "Best regards, John Smith" or "Sincerely, Jane Doe"
    const signoffs = [
      /(?:best regards|regards|sincerely|cheers|thanks|thank you|kind regards|warm regards|respectfully|yours truly|best)[,\.]?\s*[\r\n]+\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
      /(?:best regards|regards|sincerely|cheers|thanks|thank you|kind regards|warm regards|respectfully|yours truly|best)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
    ]
    for (const pattern of signoffs) {
      const nameMatch = text.match(pattern)
      if (nameMatch) {
        const candidate = nameMatch[1].trim()
        // Must be 2+ words or a single capitalized name, and not a common word
        const commonWords = ["The", "This", "Your", "You", "All", "For", "And", "But", "With"]
        if (candidate.length >= 3 && !commonWords.includes(candidate)) {
          info.name = candidate
          break
        }
      }
    }

    // Phone: match international and US formats
    const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4})/)
    if (phoneMatch) {
      const phone = phoneMatch[1].trim()
      // Filter out years, zip codes, etc. — must be 7+ digits
      const digits = phone.replace(/\D/g, "")
      if (digits.length >= 7 && digits.length <= 15) {
        info.phone = phone
      }
    }

    // LinkedIn URL
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub|company)\/[^\s<"'.,)]+/i)
    if (linkedinMatch) {
      info.linkedin = linkedinMatch[0]
    }

    // Company: look for patterns like "Company Name" after "at" or in signature
    // Try "at Company Name" pattern — must be a proper company name, not sentence text
    const atCompanyMatch = text.match(/\bat\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+){0,3})(?:\s*[,.\n]|$)/);
    if (atCompanyMatch) {
      const candidate = atCompanyMatch[1].trim()
      // Filter out common false positives
      const falseCompanies = ["The", "This", "Your", "Our", "A", "An", "My", "Their", "Its", "Least", "Most", "Best", "All"]
      if (!falseCompanies.includes(candidate) && candidate.length >= 3) {
        info.company = candidate
      }
    }

    // Location: look for "City, State" or "City, Country" pattern
    // Only match near the end of the email (signature area) and require valid state/country format
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
    const lastLines = lines.slice(-8) // Check last 8 lines for signature location
    const US_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"])
    const COUNTRIES = new Set(["USA","UK","Canada","Mexico","Brazil","Argentina","Spain","France","Germany","Italy","Portugal","Netherlands","Belgium","Switzerland","Austria","Sweden","Norway","Denmark","Finland","Poland","India","China","Japan","Korea","Singapore","Australia","NewZealand","SouthAfrica","UAE","SaudiArabia","Israel","Turkey","Russia"])
    
    for (const line of lastLines) {
      // Match "City, ST" (US state code)
      const usStateMatch = line.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})$/)
      if (usStateMatch && US_STATES.has(usStateMatch[2])) {
        info.location = `${usStateMatch[1]}, ${usStateMatch[2]}`
        break
      }
      // Match "City, Country" where country is a known country name
      const countryMatch = line.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z][a-z]+)$/)
      if (countryMatch && COUNTRIES.has(countryMatch[2])) {
        info.location = `${countryMatch[1]}, ${countryMatch[2]}`
        break
      }
    }

    return info
  }

  // Extract unique email addresses with their most recent message info
  const uniqueSenders = new Map<string, { name: string; email: string; lastContact: string; subject: string; body: string }>()

  for (const msg of messages) {
    if (!msg.from_address) continue
    // Parse "Name <email@example.com>" or just "email@example.com"
    const from = msg.from_address as string
    let name = from
    let email = from

    const match = from.match(/^(.+?)\s*<(.+?)>$/)
    if (match) {
      name = match[1].trim().replace(/"/g, "")
      email = match[2].trim()
    }

    // Skip the user's own email addresses — don't import self as contact
    if (ownEmails.has(email.toLowerCase())) continue

    // Skip generic/no-reply senders
    const lowerEmail = email.toLowerCase()
    if (lowerEmail.includes("noreply") || lowerEmail.includes("no-reply") || lowerEmail.includes("notifications") || lowerEmail.includes("donotreply")) continue

    // Skip if already have this email with a more recent message
    const existing = uniqueSenders.get(email)
    const msgDate = msg.received_at || new Date().toISOString()
    if (!existing || msgDate > existing.lastContact) {
      uniqueSenders.set(email, { name, email, lastContact: msgDate, subject: msg.subject || "", body: msg.body || "" })
    }
  }

  console.log("[IMPORT DEBUG] Unique senders found:", uniqueSenders.size, Array.from(uniqueSenders.keys()).slice(0, 5))

  // Check which contacts already exist
  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("email")
    .eq("user_id", userId)
    .in("email", Array.from(uniqueSenders.keys()))

  const existingEmails = new Set((existingContacts || []).map((c: any) => c.email))
  console.log("[IMPORT DEBUG] Existing emails:", existingEmails.size, Array.from(existingEmails).slice(0, 5))

  let imported = 0
  for (const [email, info] of Array.from(uniqueSenders.entries())) {
    if (existingEmails.has(email)) { console.log("[IMPORT DEBUG] Skipping existing:", email); continue }

    // Parse signature info from email body
    const sigInfo = parseSignatureInfo(info.body)
    console.log("[IMPORT DEBUG] Parsed signature for", email, sigInfo)

    // Guess company from email domain (fallback if not found in signature)
    let company = sigInfo.company || ""
    if (!company) {
      const domainMatch = email.match(/@(.+)$/)
      if (domainMatch) {
        const domain = domainMatch[1]
        if (!domain.includes("gmail.com") && !domain.includes("yahoo.com") && !domain.includes("hotmail.com") && !domain.includes("outlook.com")) {
          company = domain.replace(/\.(com|net|org|io|co\.\w+)$/, "").replace(/-/g, " ")
          company = company.charAt(0).toUpperCase() + company.slice(1)
        }
      }
    }

    // Build tags — include linkedin if found
    const tags: string[] = []
    if (sigInfo.linkedin) tags.push("linkedin")

    // Use signature name if from_address name is just the email (no proper name)
    const fromName = (info.name === email || info.name.includes("@")) ? (sigInfo.name || email.split("@")[0]) : info.name

    console.log("[IMPORT DEBUG] Inserting contact:", { name: fromName, email, company, phone: sigInfo.phone, location: sigInfo.location, tags })
    const { error: insertError } = await supabase.from("contacts").insert({
      user_id: userId,
      name: fromName,
      email: info.email,
      company: company || null,
      role: null,
      phone: sigInfo.phone || null,
      location: sigInfo.location || null,
      tags,
      starred: false,
      source: "email_import",
      last_contact: info.lastContact,
      deal_value: 0,
      deal_stage: null,
    })

    if (insertError) {
      console.error("[IMPORT DEBUG] Insert failed:", insertError.message)
    } else {
      imported++
    }
  }

  console.log("[IMPORT DEBUG] Total imported:", imported)
  return imported
}

// Import contacts from WhatsApp messages (extract unique senders)
export async function importContactsFromWhatsApp(userId: string): Promise<number> {
  console.log("[WA IMPORT] Starting WhatsApp contact import for user:", userId)
  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("from_number, body, timestamp")
    .eq("user_id", userId)
    .eq("direction", "received")
    .not("from_number", "is", null)

  if (error || !messages || messages.length === 0) {
    console.log("[WA IMPORT] No WhatsApp messages found, returning 0")
    return 0
  }

  // Extract unique phone numbers with most recent message
  const uniqueSenders = new Map<string, { phone: string; lastContact: string }>()
  for (const msg of messages) {
    if (!msg.from_number) continue
    const phone = msg.from_number as string
    const msgDate = msg.timestamp || new Date().toISOString()
    const existing = uniqueSenders.get(phone)
    if (!existing || msgDate > existing.lastContact) {
      uniqueSenders.set(phone, { phone, lastContact: msgDate })
    }
  }

  console.log("[WA IMPORT] Unique WhatsApp senders:", uniqueSenders.size)

  // Try to fetch pushNames from VPS
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ""
  const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ""
  const pushNameMap = new Map<string, string>()
  if (EVOLUTION_URL && EVOLUTION_KEY) {
    try {
      const { data: session } = await createAdminClient()
        .from("whatsapp_sessions")
        .select("instance_name")
        .eq("user_id", userId)
        .eq("status", "connected")
        .single()
      if (session?.instance_name) {
        const res = await fetch(`${EVOLUTION_URL}/chat/findContacts/${session.instance_name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ where: {} }),
        })
        if (res.ok) {
          const contacts = await res.json()
          if (Array.isArray(contacts)) {
            for (const c of contacts) {
              const jid = c.remoteJid || ""
              const altJid = c.remoteJidAlt || ""
              const raw = (altJid && altJid.includes("@s.whatsapp.net")) ? altJid : jid
              const phone = raw.replace(/@.+$/, "").replace(/[^0-9]/g, "")
              if (phone && c.pushName) {
                pushNameMap.set(phone, c.pushName)
              }
            }
          }
        }
      }
    } catch (e) { console.error("[WA IMPORT] VPS contact fetch failed:", e) }
  }

  // Check which contacts already exist by phone
  const phones = Array.from(uniqueSenders.keys())
  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("phone, name")
    .eq("user_id", userId)
    .in("phone", phones)

  const existingPhones = new Map<string, string>((existingContacts || []).map((c: any) => [c.phone, c.name]))
  console.log("[WA IMPORT] Existing phone contacts:", existingPhones.size)

  let imported = 0
  for (const [phone, info] of Array.from(uniqueSenders.entries())) {
    const pushName = pushNameMap.get(phone) || ""
    const existingName = existingPhones.get(phone)

    if (existingName !== undefined) {
      // Update name if we have a pushName and current name is just the phone number
      if (pushName && (existingName === phone || !existingName)) {
        await supabase.from("contacts").update({ name: pushName }).eq("user_id", userId).eq("phone", phone)
      }
      continue
    }

    // Create new contact with pushName if available
    const displayName = pushName || phone

    const { error: insertError } = await supabase.from("contacts").insert({
      user_id: userId,
      name: displayName,
      email: null,
      phone: info.phone,
      company: null,
      role: null,
      location: null,
      tags: ["whatsapp"],
      starred: false,
      source: "whatsapp_import",
      last_contact: info.lastContact,
      deal_value: 0,
      deal_stage: null,
    })

    if (insertError) {
      console.error("[WA IMPORT] Insert failed:", insertError.message)
    } else {
      imported++
    }
  }

  console.log("[WA IMPORT] Total imported:", imported)
  return imported
}

// ─── Calendar ───
export interface CalendarConnection {
  id: string
  user_id: string
  provider: string
  status: string
  calendar_email?: string
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  summary: string
  description?: string
  start_time?: string
  end_time?: string
  attendees?: any[]
  location?: string
  event_link?: string
  is_online?: boolean
}

export async function getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, user_id, provider, status, calendar_email, created_at")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as CalendarConnection[]
}

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true })
  if (error) throw error
  return (data ?? []) as CalendarEvent[]
}

export async function deleteCalendarConnection(userId: string, connectionId: string) {
  // Delete associated calendar events first
  const { error: eventError } = await supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("connection_id", connectionId)
  if (eventError) console.error("[deleteCalendarConnection] Failed to delete events:", eventError.message)

  // Delete contacts imported from calendar
  const { error: calContactError } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("source", "calendar_import")
  if (calContactError) console.error("[deleteCalendarConnection] Failed to delete contacts:", calContactError.message)

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId)
  if (error) throw error
}

// ─── WhatsApp ───
export interface WhatsAppConnection {
  id: string
  user_id: string
  phone_number_id: string
  phone_number?: string
  display_name?: string
  status: string
  webhook_verified?: boolean
  created_at: string
}

export interface WhatsAppMessage {
  id: string
  user_id: string
  direction: string
  from_number?: string
  to_number?: string
  body?: string
  timestamp?: string
  read?: boolean
  created_at: string
}

export async function getWhatsAppConnections(userId: string): Promise<WhatsAppConnection[]> {
  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as WhatsAppConnection[]
}

export async function getWhatsAppMessages(userId: string): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
  if (error) throw error
  return (data ?? []) as WhatsAppMessage[]
}

export async function saveWhatsAppConnection(userId: string, phoneNumberId: string, accessToken: string, phoneNumber?: string, displayName?: string) {
  const { error } = await supabase.from("whatsapp_connections").insert({
    user_id: userId,
    phone_number_id: phoneNumberId,
    access_token: accessToken,
    phone_number: phoneNumber,
    display_name: displayName,
    status: "connected",
  })
  if (error) throw error
}

export async function deleteWhatsAppConnection(userId: string, connectionId: string) {
  // Delete associated WhatsApp messages first
  const { error: msgError } = await supabase
    .from("whatsapp_messages")
    .delete()
    .eq("user_id", userId)
    .eq("connection_id", connectionId)
  if (msgError) console.error("[deleteWhatsAppConnection] Failed to delete messages:", msgError.message)

  // Delete contacts imported from WhatsApp
  const { error: waContactError } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("source", "whatsapp_import")
  if (waContactError) console.error("[deleteWhatsAppConnection] Failed to delete contacts:", waContactError.message)

  const { error } = await supabase
    .from("whatsapp_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId)
  if (error) throw error
}

// ─── Telegram ───
export interface TelegramConnection {
  id: string
  user_id: string
  bot_token: string
  bot_username?: string
  bot_first_name?: string
  status: string
  webhook_verified?: boolean
  created_at: string
}

export interface TelegramMessage {
  id: string
  user_id: string
  connection_id: string
  direction: string
  chat_id?: string
  chat_type?: string
  chat_title?: string
  from_id?: string
  from_first_name?: string
  from_last_name?: string
  from_username?: string
  tg_message_id?: number
  body?: string
  timestamp?: string
  read?: boolean
  created_at: string
}

export async function getTelegramConnections(userId: string): Promise<TelegramConnection[]> {
  const { data, error } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as TelegramConnection[]
}

export async function getTelegramUserSession(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("telegram_user_sessions")
    .select("user_id, phone_number, tg_username, tg_first_name, tg_last_name, status")
    .eq("user_id", userId)
    .in("status", ["connected", "expired", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data
}

export async function markMessageAsRead(source: "whatsapp" | "telegram" | "slack", messageId: string): Promise<void> {
  try {
    await fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, messageId }),
    })
  } catch (err) {
    console.error(`[markMessageAsRead] ${source} failed:`, err)
  }
}

export async function getTelegramMessages(userId: string): Promise<TelegramMessage[]> {
  const { data, error } = await supabase
    .from("telegram_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
  if (error) throw error
  return (data ?? []) as TelegramMessage[]
}

export async function saveTelegramConnection(
  userId: string,
  botToken: string,
  botUsername?: string,
  botFirstName?: string
) {
  const { error } = await supabase.from("telegram_connections").insert({
    user_id: userId,
    bot_token: botToken,
    bot_username: botUsername,
    bot_first_name: botFirstName,
    status: "connected",
  })
  if (error) throw error
}

export async function deleteTelegramContacts(userId: string) {
  const { error } = await supabase.from("contacts").delete().eq("user_id", userId).eq("source", "telegram_import")
  if (error) console.error("[deleteTelegramContacts]", error.message)
}

export async function deleteTelegramConnection(userId: string, connectionId: string) {
  const { error: msgError } = await supabase
    .from("telegram_messages")
    .delete()
    .eq("user_id", userId)
    .eq("connection_id", connectionId)
  if (msgError) console.error("[deleteTelegramConnection] Failed to delete messages:", msgError.message)

  const { error: contactError } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("source", "telegram_import")
  if (contactError) console.error("[deleteTelegramConnection] Failed to delete contacts:", contactError.message)

  const { error } = await supabase
    .from("telegram_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId)
  if (error) throw error
}

// Import contacts from Telegram messages (extract unique senders)
export async function importContactsFromTelegram(userId: string): Promise<number> {
  const { data: messages, error } = await supabase
    .from("telegram_messages")
    .select("from_id, from_first_name, from_last_name, from_username, from_phone, body, timestamp")
    .eq("user_id", userId)
    .eq("direction", "received")
    .not("from_id", "is", null)

  if (error || !messages || messages.length === 0) return 0

  // Skip known Telegram service accounts
  const SERVICE_ACCOUNT_IDS = new Set(["777000", "427728", "333000"])

  const uniqueSenders = new Map<string, { firstName?: string; lastName?: string; username?: string; phone?: string; lastContact?: string }>()
  for (const msg of messages) {
    if (SERVICE_ACCOUNT_IDS.has(msg.from_id)) continue
    if (!uniqueSenders.has(msg.from_id)) {
      uniqueSenders.set(msg.from_id, {
        firstName: msg.from_first_name,
        lastName: msg.from_last_name,
        username: msg.from_username,
        phone: msg.from_phone,
        lastContact: msg.timestamp,
      })
    }
  }

  if (uniqueSenders.size === 0) return 0

  const senderIds = Array.from(uniqueSenders.keys())
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, phone")
    .eq("user_id", userId)
    .in("phone", senderIds)

  const existingPhones = new Set((existing ?? []).map((c: any) => c.phone))
  const newSenders = senderIds.filter(id => !existingPhones.has(id))
  if (newSenders.length === 0) return 0

  const rows = newSenders.map(id => {
    const info = uniqueSenders.get(id)!
    const name = [info.firstName, info.lastName].filter(Boolean).join(" ") || info.username || id
    const phone = info.phone || (info.username ? `@${info.username}` : id)
    return {
      user_id: userId,
      name,
      email: null,
      phone,
      company: null,
      role: null,
      location: null,
      tags: ["telegram"],
      starred: false,
      source: "telegram_import",
      last_contact: info.lastContact,
      deal_value: 0,
      deal_stage: null,
    }
  })

  const { error: insertError } = await supabase.from("contacts").insert(rows)
  if (insertError) console.error("[TG IMPORT] Insert failed:", insertError.message)
  return rows.length
}

// ─── Realtime Subscriptions ───
export function subscribeToEmailMessages(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("email_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "email_messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log("[REALTIME] email_messages event:", payload.eventType, payload)
        callback(payload)
      }
    )
    .subscribe((status: string, err?: any) => {
      if (err) {
        console.error("[REALTIME] email_messages subscription error:", err)
      } else {
        console.log("[REALTIME] email_messages subscription status:", status)
      }
    })

  return channel
}

export function subscribeToCalendarEvents(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("calendar_events")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "calendar_events",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => callback(payload)
    )
    .subscribe()

  return channel
}

export function subscribeToContacts(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("contacts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "contacts",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => callback(payload)
    )
    .subscribe()

  return channel
}

export function unsubscribeChannel(channel: ReturnType<typeof subscribeToEmailMessages>) {
  supabase.removeChannel(channel)
}

export function subscribeToWhatsAppMessages(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("whatsapp_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "whatsapp_messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log("[REALTIME] whatsapp_messages event:", payload.eventType, payload)
        callback(payload)
      }
    )
    .subscribe((status: string, err?: any) => {
      if (err) {
        console.error("[REALTIME] whatsapp_messages subscription error:", err)
      } else {
        console.log("[REALTIME] whatsapp_messages subscription status:", status)
      }
    })

  return channel
}

export function subscribeToTelegramMessages(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("telegram_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "telegram_messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log("[REALTIME] telegram_messages event:", payload.eventType, payload)
        callback(payload)
      }
    )
    .subscribe((status: string, err?: any) => {
      if (err) {
        console.error("[REALTIME] telegram_messages subscription error:", err)
      } else {
        console.log("[REALTIME] telegram_messages subscription status:", status)
      }
    })

  return channel
}

export function subscribeToSlackMessages(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("slack_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "slack_messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log("[REALTIME] slack_messages event:", payload.eventType, payload)
        callback(payload)
      }
    )
    .subscribe((status: string, err?: any) => {
      if (err) {
        console.error("[REALTIME] slack_messages subscription error:", err)
      } else {
        console.log("[REALTIME] slack_messages subscription status:", status)
      }
    })

  return channel
}

// ─── CRM Kanban column persistence ───────────────────────────────────────────

export async function getKanbanCols(userId: string, board: "email" | "messages" | "calendar") {
  const { data, error } = await supabase
    .from("crm_kanban_cols")
    .select("col_id, label, color, position")
    .eq("user_id", userId)
    .eq("board", board)
    .order("position")
  if (error) throw error
  return (data || []).map((r: any) => ({ id: r.col_id, label: r.label, color: r.color }))
}

export async function upsertKanbanCols(
  userId: string,
  board: "email" | "messages" | "calendar",
  cols: { id: string; label: string; color: string }[]
) {
  await supabase.from("crm_kanban_cols").delete().eq("user_id", userId).eq("board", board)
  if (cols.length === 0) return
  const { error } = await supabase.from("crm_kanban_cols").insert(
    cols.map((c, i) => ({ user_id: userId, board, col_id: c.id, label: c.label, color: c.color, position: i }))
  )
  if (error) throw error
}

// ─── CRM Kanban card-to-column persistence ──────────────────────────────────

export async function getKanbanCardCols(userId: string, board: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("crm_kanban_card_cols")
    .select("card_id, col_id")
    .eq("user_id", userId)
    .eq("board", board)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const r of data || []) map[r.card_id] = r.col_id
  return map
}

export async function setKanbanCardCol(userId: string, board: string, cardId: string, colId: string) {
  const { error } = await supabase
    .from("crm_kanban_card_cols")
    .upsert({ user_id: userId, board, card_id: cardId, col_id: colId, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Support screenshots
export async function uploadSupportScreenshot(userId: string, file: File) {
  const filePath = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const { error } = await supabase.storage
    .from("support-screenshots")
    .upload(filePath, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from("support-screenshots").getPublicUrl(filePath)
  return data.publicUrl
}

// ─── Notifications ───

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    data: data ?? {},
    read: false,
  })
  if (error) console.error("[createNotification]", error.message)
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: any
  read: boolean
  created_at: string
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)

  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)

  if (error) throw error
}

export function subscribeToNotifications(
  userId: string,
  callback: (payload: { eventType: string; new: any; old: any }) => void
) {
  const channel = supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => callback(payload)
    )
    .subscribe()

  return channel
}

// ─── Slack Helpers ───
export interface SlackConnection {
  id: string
  user_id: string
  team_id: string
  team_name: string
  bot_user_id: string
  bot_access_token: string
  user_access_token: string | null
  status: string
  created_at: string
}

export interface SlackMessage {
  id: string
  user_id: string
  connection_id: string
  direction: string
  channel_id: string
  channel_name: string | null
  slack_user_id: string | null
  slack_user_name: string | null
  slack_ts: string
  body: string
  timestamp: string
  read: boolean
}

export async function getSlackConnections(userId: string): Promise<SlackConnection[]> {
  const { data, error } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
  if (error) throw error
  return data as SlackConnection[]
}

export async function saveSlackConnection(conn: Omit<SlackConnection, "id" | "created_at">): Promise<SlackConnection> {
  const { data: existing } = await supabase
    .from("slack_connections")
    .select("id")
    .eq("user_id", conn.user_id)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from("slack_connections")
      .update({
        team_id: conn.team_id,
        team_name: conn.team_name,
        bot_user_id: conn.bot_user_id,
        bot_access_token: conn.bot_access_token,
        user_access_token: conn.user_access_token || null,
        status: "connected",
      })
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw error
    return data as SlackConnection
  }

  const { data, error } = await supabase
    .from("slack_connections")
    .insert(conn)
    .select("*")
    .single()
  if (error) throw error
  return data as SlackConnection
}

export async function deleteSlackConnection(userId: string): Promise<void> {
  await supabase.from("slack_messages").delete().eq("user_id", userId)
  const { error: contactError } = await supabase.from("contacts").delete().eq("user_id", userId).eq("source", "slack_import")
  if (contactError) console.error("[deleteSlackConnection] Failed to delete contacts:", contactError.message)
  await supabase.from("slack_connections").delete().eq("user_id", userId)
}

export async function getSlackMessages(userId: string): Promise<SlackMessage[]> {
  const { data, error } = await supabase
    .from("slack_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []) as SlackMessage[]
}

export async function saveSlackMessage(msg: Omit<SlackMessage, "id">): Promise<void> {
  const { error } = await supabase
    .from("slack_messages")
    .upsert(msg, { onConflict: "user_id,slack_ts" })
  if (error && error.code !== "23505") console.error("[SLACK] Save message failed:", error.message)
}

export async function importContactsFromSlack(userId: string): Promise<number> {
  const { data: messages } = await supabase
    .from("slack_messages")
    .select("slack_user_id, slack_user_name, timestamp")
    .eq("user_id", userId)
    .eq("direction", "received")
    .order("timestamp", { ascending: false })

  if (!messages || messages.length === 0) return 0

  const uniqueSenders = new Map<string, { name: string; lastContact: string }>()
  for (const m of messages) {
    if (!m.slack_user_id) continue
    if (!uniqueSenders.has(m.slack_user_id)) {
      uniqueSenders.set(m.slack_user_id, {
        name: m.slack_user_name || m.slack_user_id,
        lastContact: m.timestamp,
      })
    }
  }

  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("phone")
    .eq("user_id", userId)
    .in("phone", Array.from(uniqueSenders.keys()))

  const existingIds = new Set((existingContacts || []).map((c: any) => c.phone))
  const newSenders = Array.from(uniqueSenders.entries()).filter(([id]) => !existingIds.has(id))

  if (newSenders.length === 0) return 0

  const rows = newSenders.map(([id, info]) => ({
    user_id: userId,
    name: info.name,
    email: null,
    phone: id,
    company: null,
    role: null,
    location: null,
    tags: ["slack"],
    starred: false,
    source: "slack_import",
    last_contact: info.lastContact,
    deal_value: 0,
    deal_stage: null,
  }))

  const { error: insertError } = await supabase.from("contacts").insert(rows)
  if (insertError) console.error("[SLACK IMPORT] Insert failed:", insertError.message)
  return rows.length
}

// ─── Evolution API (WhatsApp QR Gateway) ───

export interface EvolutionSession {
  id: string
  user_id: string
  instance_name: string
  phone_number: string | null
  status: "connecting" | "connected" | "disconnected"
  provider: "evolution" | "meta"
  created_at: string
  updated_at: string
}

export interface EvolutionMessage {
  id: string
  user_id: string
  session_id: string
  direction: "sent" | "received"
  from_number: string
  to_number: string
  wa_message_id: string | null
  body: string
  media_url: string | null
  media_type: string | null
  timestamp: string
  read: boolean
}

const EVOLUTION_FIFO_LIMIT = 500

export async function getEvolutionSessions(userId: string): Promise<EvolutionSession[]> {
  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data || []) as EvolutionSession[]
}

export async function createEvolutionSession(userId: string, instanceName: string): Promise<EvolutionSession> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("whatsapp_sessions")
    .insert({
      user_id: userId,
      instance_name: instanceName,
      status: "connecting",
      provider: "evolution",
    })
    .select("*")
    .single()
  if (error) throw error
  return data as EvolutionSession
}

export async function updateEvolutionSession(sessionId: string, updates: Partial<EvolutionSession>): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("whatsapp_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
  if (error) throw error
}

export async function deleteEvolutionSession(userId: string, sessionId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from("whatsapp_messages").delete().eq("session_id", sessionId)
  await admin.from("whatsapp_sessions").delete().eq("id", sessionId).eq("user_id", userId)
}

export async function getEvolutionContacts(userId: string, sessionId?: string): Promise<{ contactNumber: string; lastMessage: EvolutionMessage; unreadCount: number }[]> {
  let query = supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
  if (sessionId) query = query.eq("session_id", sessionId)
  const { data, error } = await query
  if (error) throw error
  const allMsgs = (data || []) as EvolutionMessage[]

  // Group by contact number (the remote number, not the user's own)
  const contactMap = new Map<string, { lastMessage: EvolutionMessage; unreadCount: number }>()
  for (const msg of allMsgs) {
    const contactNumber = msg.direction === "received" ? msg.from_number : msg.to_number
    if (!contactNumber) continue
    if (!contactMap.has(contactNumber)) {
      contactMap.set(contactNumber, {
        lastMessage: msg,
        unreadCount: 0,
      })
    }
    const entry = contactMap.get(contactNumber)!
    if (msg.direction === "received" && !msg.read) entry.unreadCount++
  }

  return Array.from(contactMap.entries()).map(([contactNumber, info]) => ({
    contactNumber,
    lastMessage: info.lastMessage,
    unreadCount: info.unreadCount,
  }))
}

export async function getEvolutionMessages(userId: string, contactNumber?: string, sessionId?: string): Promise<EvolutionMessage[]> {
  let query = supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(EVOLUTION_FIFO_LIMIT)
  if (sessionId) query = query.eq("session_id", sessionId)
  if (contactNumber) {
    query = query.or(`from_number.eq.${contactNumber},to_number.eq.${contactNumber}`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as EvolutionMessage[]
}

export async function saveEvolutionMessage(msg: Omit<EvolutionMessage, "id">): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("whatsapp_messages").insert(msg)
  if (error) {
    console.error("[WA MSG] Insert failed:", error.message)
    return
  }

  // FIFO per contact: identify the contact number (the remote party)
  const contactNumber = msg.direction === "received" ? msg.from_number : msg.to_number
  if (!contactNumber) return

  // Count messages for this user + contact and delete oldest beyond limit
  const { data: countData, error: countError } = await admin
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", msg.user_id)
    .or(`from_number.eq.${contactNumber},to_number.eq.${contactNumber}`)
    .order("timestamp", { ascending: false })
  if (countError || !countData) return

  if (countData.length > EVOLUTION_FIFO_LIMIT) {
    const toDelete = countData.slice(EVOLUTION_FIFO_LIMIT).map((r: any) => r.id)
    if (toDelete.length > 0) {
      await admin.from("whatsapp_messages").delete().in("id", toDelete)
    }
  }
}
