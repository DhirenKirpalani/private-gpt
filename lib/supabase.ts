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
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single()

  if (error) throw error
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
export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split(".").pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
  return data.publicUrl
}
