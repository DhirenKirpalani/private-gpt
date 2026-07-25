export function getWebmailUrl(email: string, searchQuery?: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return null

  const q = searchQuery || "supabase"

  const map: Record<string, string> = {
    "gmail.com": `https://mail.google.com/mail/#search/${encodeURIComponent(q)}`,
    "googlemail.com": `https://mail.google.com/mail/#search/${encodeURIComponent(q)}`,
    "outlook.com": `https://outlook.live.com/mail/?search=${encodeURIComponent(q)}`,
    "hotmail.com": `https://outlook.live.com/mail/?search=${encodeURIComponent(q)}`,
    "live.com": `https://outlook.live.com/mail/?search=${encodeURIComponent(q)}`,
    "msn.com": `https://outlook.live.com/mail/?search=${encodeURIComponent(q)}`,
    "yahoo.com": `https://mail.yahoo.com/d/search/keyword=${encodeURIComponent(q)}`,
    "yahoo.es": `https://mail.yahoo.com/d/search/keyword=${encodeURIComponent(q)}`,
    "icloud.com": "https://www.icloud.com/mail",
    "me.com": "https://www.icloud.com/mail",
    "mac.com": "https://www.icloud.com/mail",
    "zoho.com": "https://mail.zoho.com",
    "aol.com": `https://mail.aol.com/webmail-std/en-us/search?query=${encodeURIComponent(q)}`,
    "proton.me": "https://mail.proton.me",
    "protonmail.com": "https://mail.proton.me",
    "gmx.com": "https://www.gmx.com/mail/",
    "gmx.net": "https://www.gmx.net/mail/",
    "yandex.com": "https://mail.yandex.com",
    "yandex.ru": "https://mail.yandex.com",
  }

  return map[domain] || null
}
