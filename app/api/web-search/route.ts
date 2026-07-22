import { NextRequest, NextResponse } from "next/server"

const SERPER_URL = process.env.SERPER_URL || "https://google.serper.dev/search"
const DEEPSEEK_URL = process.env.DEEPSEEK_URL || "https://api.deepseek.com/v1/chat/completions"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"

/* ─── Domain authority scoring for reranking ─── */
const HIGH_AUTHORITY_DOMAINS = new Set([
  "wikipedia.org",
  "github.com",
  "stackoverflow.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "techcrunch.com",
  "theguardian.com",
  "nytimes.com",
  "wsj.com",
  "economist.com",
  "nature.com",
  "sciencedirect.com",
  "arxiv.org",
  "ieee.org",
  "acm.org",
  "who.int",
  "un.org",
  "worldbank.org",
])

const OFFICIAL_DOC_PATTERNS = [
  /docs\./,
  /developer\./,
  /support\./,
  /help\./,
  /learn\./,
  /wiki\./,
  /reference\./,
  /api\./,
]

const SEO_BLOG_PATTERNS = [
  /medium\.com\/(?!@)/,
  /blogspot\./,
  /wordpress\.com\/(?!vip)/,
  /quora\.com/,
  /reddit\.com\//,
  /pinterest\./,
]

function getDomainScore(hostname: string, pathname: string): number {
  let score = 0

  // High authority bonus
  Array.from(HIGH_AUTHORITY_DOMAINS).forEach(domain => {
    if (score === 0 && hostname.endsWith(domain)) score += 10
  })

  // Government / education
  if (hostname.endsWith(".gov") || hostname.endsWith(".edu") || hostname.endsWith(".ac.uk")) {
    score += 10
  }

  // Official documentation
  for (const pat of OFFICIAL_DOC_PATTERNS) {
    if (pat.test(hostname) || pat.test(pathname)) { score += 6; break }
  }

  // Major org bonus
  if (hostname.endsWith(".org")) score += 3

  // SEO / low-quality penalty
  for (const pat of SEO_BLOG_PATTERNS) {
    if (pat.test(hostname + pathname)) { score -= 8; break }
  }

  return score
}

function keywordMatchScore(title: string, snippet: string, query: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const text = (title + " " + snippet).toLowerCase()
  let matches = 0
  for (const w of qWords) {
    if (text.includes(w)) matches++
  }
  return (matches / Math.max(qWords.length, 1)) * 4
}

/* ─── Step 1: Query Rewriting ─── */
async function rewriteQuery(original: string): Promise<string[]> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (!deepseekKey) return [original]

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a search query optimizer. Generate 2-3 concise Google search queries that will retrieve the most relevant and authoritative information for the user's question. Output ONLY the queries, one per line. No numbering, no extra text.",
          },
          { role: "user", content: original },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
    })

    if (!res.ok) return [original]
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() ?? ""
    const queries = text
      .split("\n")
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 0 && !/^\d+[.)]/.test(q)) // remove numbering
      .map((q: string) => q.replace(/^\d+[.)]\s*/, "")) // strip any remaining numbering
      .filter((q: string) => q.length > 5)
      .slice(0, 3)

    return queries.length > 0 ? queries : [original]
  } catch {
    return [original]
  }
}

/* ─── Step 2: Search a single query ─── */
async function searchSerper(query: string, apiKey: string): Promise<any[]> {
  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: 8 }),
  })

  if (!res.ok) return []
  const data = await res.json()
  return (data.organic || []).map((r: any) => ({
    title: r.title || "",
    snippet: r.snippet || "",
    url: r.link || "",
    hostname: r.link ? new URL(r.link).hostname.replace(/^www\./, "") : "",
    pathname: r.link ? new URL(r.link).pathname : "",
  }))
}

/* ─── Step 3: Rerank + Deduplicate ─── */
function rerankResults(results: any[], query: string): any[] {
  const seen = new Set<string>()
  const scored = results
    .map(r => {
      const domainScore = getDomainScore(r.hostname, r.pathname)
      const kwScore = keywordMatchScore(r.title, r.snippet, query)
      const lenScore = r.snippet.length > 80 ? 2 : r.snippet.length > 40 ? 1 : 0
      return { ...r, totalScore: domainScore + kwScore + lenScore }
    })
    .filter(r => {
      const key = r.url
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.totalScore - a.totalScore)

  return scored.slice(0, 5)
}

/* ─── Step 4: Context Compression ─── */
function compressContext(results: any[]): { formatted: string; sources: any[] } {
  const formatted = results
    .map((r, i) => {
      const lines = [
        `[${i + 1}] ${r.title}`,
        `    Source: ${r.url}`,
        `    Summary: ${r.snippet}`,
      ]
      return lines.join("\n")
    })
    .join("\n\n")

  return { formatted, sources: results }
}

/* ─── Main handler ─── */
export async function POST(req: NextRequest) {
  try {
    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) {
      return NextResponse.json(
        { error: "Serper API key not configured. Add SERPER_API_KEY to your .env file." },
        { status: 500 }
      )
    }

    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Check if the query contains a URL — if so, fetch the page content directly
    const urlMatch = query.match(/(https?:\/\/[^\s]+)/i)
    if (urlMatch) {
      const targetUrl = urlMatch[1]
      try {
        const pageRes = await fetch(targetUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ExploroBot/1.0)" },
          signal: AbortSignal.timeout(10000),
        })
        if (pageRes.ok) {
          const html = await pageRes.text()
          // Extract text content from HTML (strip tags, scripts, styles)
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000) // Limit to 8000 chars

          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
          const title = titleMatch ? titleMatch[1].trim() : targetUrl

          const hostname = new URL(targetUrl).hostname.replace(/^www\./, "")

          return NextResponse.json({
            formatted: `[1] ${title}\n    Source: ${targetUrl}\n    Content: ${text}`,
            sources: [{ title, url: targetUrl, snippet: text.slice(0, 200), hostname, pathname: new URL(targetUrl).pathname }],
            query,
            queries: [targetUrl],
            empty: false,
          })
        }
      } catch (err: any) {
        console.error("[WEB SEARCH] URL fetch failed:", err?.message)
        // Fall through to normal search
      }
    }

    // Step 1: Rewrite query into 2-3 search queries
    const queries = await rewriteQuery(query)

    // Step 2: Multi-search
    const allResults: any[] = []
    for (const q of queries) {
      const results = await searchSerper(q, serperKey)
      allResults.push(...results)
    }

    // Step 3: Rerank + deduplicate
    const topResults = rerankResults(allResults, query)

    // Fallback: if no results, return empty gracefully
    if (topResults.length === 0) {
      return NextResponse.json({
        formatted: "",
        sources: [],
        query,
        queries,
        empty: true,
      })
    }

    // Step 4: Compress
    const { formatted, sources } = compressContext(topResults)

    return NextResponse.json({
      formatted,
      sources,
      query,
      queries,
      empty: false,
    })
  } catch (err: any) {
    // Graceful fallback on any error
    return NextResponse.json({
      error: err?.message ?? "Unknown error",
      formatted: "",
      sources: [],
      empty: true,
    }, { status: 500 })
  }
}
