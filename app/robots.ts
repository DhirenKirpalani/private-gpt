import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/about", "/signup", "/disclaimer", "/privacy", "/terms"],
      disallow: ["/chat", "/crm", "/channels", "/admin", "/profile", "/workspace", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
