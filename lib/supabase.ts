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
  linkedin_url: string
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
  logo_url: string
  brand_colors: any
  brand_style: string
  brand_mood: string
  input_style: string
  token_cap: number
  slogan: string
  doc_categories: any
  preferred_sources: any
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
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
  pageCount: number = 0
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
    })
    .select()
    .single()

  if (dbError) throw dbError
  return data
}

export async function fetchUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

// Categories
export async function fetchUserCategories(userId: string) {
  const { data, error } = await supabase
    .from("knowledge_categories")
    .select("id, name")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })

  if (error) throw error
  return data || []
}

export async function insertCategory(userId: string, name: string) {
  const { data, error } = await supabase
    .from("knowledge_categories")
    .insert({ user_id: userId, name })
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
  const { error } = await supabase
    .from("email_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider)
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
