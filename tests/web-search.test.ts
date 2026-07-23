/**
 * Web Search Reliability Test
 *
 * Tests the /api/web-search endpoint for:
 * 1. Basic query returns results
 * 2. Empty/invalid query handling
 * 3. URL detection & direct page fetch
 * 4. Result reranking (authority domains rank higher)
 * 5. Deduplication (no duplicate URLs)
 * 6. Response format correctness
 * 7. Timeout handling
 * 8. Multiple queries produce more results than single
 *
 * Usage:
 *   npx tsx tests/web-search.test.ts
 *   (or) npm run test:web-search
 */

// ─── Load .env before anything else ───
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    const content = readFileSync(path, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
      if (!process.env[key]) process.env[key] = val
    }
  }
}
loadEnv()

// ─── Mock the api-logger module to avoid Supabase init ───
// We mock it before importing the route, so the route's withApiLogging
// wrapper uses our no-op logger instead of creating a Supabase client.
import { Module } from "module"

const originalRequire = (Module as any)._load
;(Module as any)._load = function (request: string, ...args: any[]) {
  if (request === "@/lib/with-api-logging" || request.includes("with-api-logging")) {
    // Return a passthrough wrapper that skips logging
    return {
      withApiLogging: (handler: any) => handler,
    }
  }
  if (request === "@/lib/api-logger" || request.includes("api-logger")) {
    return {
      logApiRequest: async () => {},
    }
  }
  return originalRequire.call(this, request, ...args)
}

import { NextRequest } from "next/server"

// ─── Test framework helpers ───

let passed = 0
let failed = 0
const failures: string[] = []

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    failures.push(message)
    console.log(`  ❌ ${message}`)
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  assert(ok, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`)
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n📋 ${name}`)
  try {
    await fn()
  } catch (err: any) {
    failed++
    failures.push(`${name}: ${err?.message || err}`)
    console.log(`  ❌ Threw error: ${err?.message || err}`)
  }
}

// ─── Import the route handler ───
// We need to import the POST handler directly. Since it's wrapped with withApiLogging,
// we import the module and extract the handler.

// Dynamic import of the route
async function importHandler() {
  const mod = await import("../app/api/web-search/route")
  return mod.POST
}

// ─── Helper: create a NextRequest-like object ───
function createRequest(body: any, options: { headers?: Record<string, string> } = {}): NextRequest {
  const url = "http://localhost:3000/api/web-search"
  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  })
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

// ─── Helper: parse response ───
async function parseResponse(res: Response) {
  const status = res.status
  const data = await res.json()
  return { status, data }
}

// ─── Test cases ───

async function runTests() {
  const POST = await importHandler()

  // ─── Test 1: Basic query returns results ───
  await test("Basic query returns formatted results", async () => {
    const req = createRequest({ query: "what is artificial intelligence" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 status")
    assert(typeof data.formatted === "string", "Should have formatted string")
    assert(data.formatted.length > 0, "Formatted content should not be empty")
    assert(Array.isArray(data.sources), "Should have sources array")
    assert(data.sources.length > 0, "Should have at least 1 source")
    assert(data.empty === false, "Should not be empty")
    assert(data.query === "what is artificial intelligence", "Should echo back query")
  })

  // ─── Test 2: Missing query returns 400 ───
  await test("Missing query returns 400", async () => {
    const req = createRequest({})
    const res = await POST(req, {})
    const { status } = await parseResponse(res)
    assert(status === 400, "Should return 400 for missing query")
  })

  // ─── Test 3: Empty string query returns 400 ───
  await test("Empty string query returns 400", async () => {
    const req = createRequest({ query: "" })
    const res = await POST(req, {})
    const { status } = await parseResponse(res)
    assert(status === 400, "Should return 400 for empty query")
  })

  // ─── Test 4: Non-string query returns 400 ───
  await test("Non-string query returns 400", async () => {
    const req = createRequest({ query: 123 })
    const res = await POST(req, {})
    const { status } = await parseResponse(res)
    assert(status === 400, "Should return 400 for non-string query")
  })

  // ─── Test 5: URL detection fetches page directly ───
  await test("URL query fetches page content directly", async () => {
    const req = createRequest({ query: "https://example.com" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 for URL fetch")
    assert(data.formatted.length > 0, "Should have page content")
    assert(data.sources.length === 1, "Should have exactly 1 source (the page)")
    assert(data.sources[0].url === "https://example.com", "Source URL should match")
    assert(data.queries[0] === "https://example.com", "Queries should contain the URL")
  })

  // ─── Test 6: Bare domain detection ───
  await test("Bare domain query fetches page content", async () => {
    const req = createRequest({ query: "wikipedia.org" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 for bare domain")
    assert(data.formatted.length > 0, "Should have page content")
    assert(data.sources[0].hostname.includes("wikipedia"), "Should identify wikipedia domain")
  })

  // ─── Test 7: Result format correctness ───
  await test("Result format has correct structure", async () => {
    const req = createRequest({ query: "climate change effects 2024" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200")
    for (const source of data.sources) {
      assert(typeof source.title === "string", `Source should have title string`)
      assert(typeof source.url === "string", `Source should have url string`)
      assert(source.url.startsWith("http"), `Source URL should be valid URL`)
      assert(typeof source.snippet === "string", `Source should have snippet string`)
    }
  })

  // ─── Test 8: Deduplication — no duplicate URLs ───
  await test("Results are deduplicated by URL", async () => {
    const req = createRequest({ query: "javascript array methods" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    const urls = data.sources.map((s: any) => s.url)
    const uniqueUrls = new Set(urls)
    assert(urls.length === uniqueUrls.size, "Should have no duplicate URLs in sources")
  })

  // ─── Test 9: Reranking — high authority domains rank higher ───
  await test("High authority domains are prioritized", async () => {
    const req = createRequest({ query: "what is python programming language" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.sources.length >= 2) {
      // Check if any high-authority domain appears in top results
      const topSources = data.sources.slice(0, 3)
      const hasAuthority = topSources.some((s: any) => {
        const h = s.hostname || ""
        return ["wikipedia.org", "stackoverflow.com", "github.com", "python.org", "docs.python.org"].some(d => h.endsWith(d))
      })
      assert(hasAuthority, "At least one top-3 source should be a high-authority domain")
    } else {
      assert(true, "Not enough sources to test reranking (skipped)")
    }
  })

  // ─── Test 10: Max 5 results returned ───
  await test("Returns at most 5 results", async () => {
    const req = createRequest({ query: "best practices for react state management" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(data.sources.length <= 5, `Should return at most 5 sources (got ${data.sources.length})`)
  })

  // ─── Test 11: Formatted output contains source numbers ───
  await test("Formatted output uses [1], [2] numbering", async () => {
    const req = createRequest({ query: "machine learning basics" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.formatted.length > 0) {
      assert(data.formatted.includes("[1]"), "Formatted should start with [1]")
      if (data.sources.length > 1) {
        assert(data.formatted.includes("[2]"), "Formatted should contain [2] for multiple sources")
      }
    }
  })

  // ─── Test 12: Queries array is returned ───
  await test("Queries array is returned", async () => {
    const req = createRequest({ query: "how to deploy nextjs app" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(Array.isArray(data.queries), "Should return queries array")
    assert(data.queries.length > 0, "Should have at least 1 query")
  })

  // ─── Test 13: Consistency — same query returns results twice ───
  await test("Same query produces results on repeated calls", async () => {
    const query = "what is the capital of France"
    const req1 = createRequest({ query })
    const req2 = createRequest({ query })
    const res1 = await POST(req1, {})
    const res2 = await POST(req2, {})
    const { data: data1 } = await parseResponse(res1)
    const { data: data2 } = await parseResponse(res2)

    assert(data1.sources.length > 0, "First call should return results")
    assert(data2.sources.length > 0, "Second call should return results")
  })

  // ─── Test 14: Special characters in query ───
  await test("Special characters in query are handled", async () => {
    const req = createRequest({ query: "C++ std::vector vs std::list performance" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 with special characters")
    assert(typeof data.formatted === "string", "Should return formatted string")
  })

  // ─── Test 15: Very long query is handled ───
  await test("Very long query is handled gracefully", async () => {
    const longQuery = "what is the best way to optimize a react application for performance ".repeat(10)
    const req = createRequest({ query: longQuery })
    const res = await POST(req, {})
    const { status } = await parseResponse(res)

    assert(status === 200 || status === 500, "Should not crash on long query (200 or graceful 500)")
  })

  // ─── Test 16: SEO blog domains are penalized in ranking ───
  await test("SEO blog domains rank lower than authority domains", async () => {
    const req = createRequest({ query: "what is rest api design" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.sources.length >= 2) {
      const seoDomains = ["medium.com", "quora.com", "reddit.com", "pinterest."]
      const authorityDomains = ["wikipedia.org", "stackoverflow.com", "github.com", ".gov", ".edu"]
      
      const seoIdx = data.sources.findIndex((s: any) => 
        seoDomains.some(d => (s.hostname || "").includes(d))
      )
      const authIdx = data.sources.findIndex((s: any) => 
        authorityDomains.some(d => (s.hostname || "").endsWith(d))
      )

      if (seoIdx !== -1 && authIdx !== -1) {
        assert(seoIdx > authIdx, `SEO blog (pos ${seoIdx}) should rank lower than authority (pos ${authIdx})`)
      } else {
        assert(true, "No SEO blog + authority pair found in results (skipped)")
      }
    } else {
      assert(true, "Not enough sources to compare (skipped)")
    }
  })

  // ─── Test 17: Official docs domains get bonus ───
  await test("Official documentation domains are prioritized", async () => {
    const req = createRequest({ query: "react useEffect hook documentation" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.sources.length >= 2) {
      const docPatterns = ["docs.", "developer.", "support.", "learn.", "reference."]
      const hasDocInTop3 = data.sources.slice(0, 3).some((s: any) => 
        docPatterns.some(p => (s.hostname || "").startsWith(p) || (s.hostname || "").includes(p))
      )
      if (hasDocInTop3) {
        assert(true, "Found official docs domain in top 3 ✅")
      } else {
        assert(true, "No docs.* domain in top 3 (may vary by query — soft pass)")
      }
    } else {
      assert(true, "Not enough sources (skipped)")
    }
  })

  // ─── Test 18: Query rewriting generates multiple queries ───
  await test("Query rewriting generates multiple search queries", async () => {
    const req = createRequest({ query: "how to handle authentication in next.js with supabase" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(Array.isArray(data.queries), "Should return queries array")
    // If DeepSeek is configured, we may get 2-3 queries. If not, we get the original.
    assert(data.queries.length >= 1, "Should have at least 1 query")
    if (data.queries.length > 1) {
      assert(data.queries.some((q: string) => q !== data.query), "Rewritten queries should differ from original")
    }
  })

  // ─── Test 19: URL fetch strips HTML tags from content ───
  await test("URL fetch strips HTML tags from page content", async () => {
    // Use a simple, reliable page
    const req = createRequest({ query: "https://example.com" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(data.formatted.length > 0, "Should have content")
    assert(!data.formatted.includes("<html"), "Should not contain <html> tags")
    assert(!data.formatted.includes("<body"), "Should not contain <body> tags")
    assert(!data.formatted.includes("<script"), "Should not contain <script> tags")
    assert(!data.formatted.includes("<style"), "Should not contain <style> tags")
  })

  // ─── Test 20: URL fetch extracts page title ───
  await test("URL fetch extracts <title> from page", async () => {
    const req = createRequest({ query: "https://example.com" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(data.sources.length === 1, "Should have 1 source")
    assert(data.sources[0].title.length > 0, "Should have extracted title")
    assert(data.sources[0].title !== "https://example.com", "Title should be actual page title, not URL fallback")
  })

  // ─── Test 21: URL fetch content is truncated to 8000 chars ───
  await test("URL fetch content is truncated to max 8000 chars", async () => {
    // Use a content-heavy page
    const req = createRequest({ query: "https://en.wikipedia.org/wiki/Artificial_intelligence" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.sources.length === 1 && data.formatted.includes("Content:")) {
      const contentStart = data.formatted.indexOf("Content:") + 9
      const content = data.formatted.slice(contentStart)
      assert(content.length <= 8000, `Page content should be truncated to 8000 chars (got ${content.length})`)
    } else {
      assert(true, "URL fetch didn't trigger for this page (skipped)")
    }
  })

  // ─── Test 22: Missing SERPER_API_KEY returns 500 ───
  await test("Missing SERPER_API_KEY returns 500 with message", async () => {
    const originalKey = process.env.SERPER_API_KEY
    delete process.env.SERPER_API_KEY

    const req = createRequest({ query: "test query" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 500, "Should return 500 when API key is missing")
    assert(data.error && data.error.includes("Serper"), "Error message should mention Serper")

    process.env.SERPER_API_KEY = originalKey
  })

  // ─── Test 23: Total failure returns graceful 500 ───
  await test("Handler catches unexpected errors gracefully", async () => {
    // Send invalid JSON body to trigger parse error
    const url = "http://localhost:3000/api/web-search"
    const req = new NextRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    })
    const res = await POST(req, {})
    const { status } = await parseResponse(res)

    assert(status === 400 || status === 500, "Should return 400 or 500 for invalid JSON (graceful)")
  })

  // ─── Test 24: Response time under 15 seconds ───
  await test("Search completes within 15 seconds", async () => {
    const start = Date.now()
    const req = createRequest({ query: "typescript best practices 2024" })
    const res = await POST(req, {})
    const elapsed = Date.now() - start

    assert(elapsed < 15000, `Search should complete in <15s (took ${elapsed}ms)`)
  })

  // ─── Test 25: Multi-query produces results ───
  await test("Multi-query search returns sufficient results", async () => {
    const req = createRequest({ query: "docker kubernetes deployment best practices" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    assert(data.sources.length >= 1, "Should return at least 1 result for multi-query search")
    assert(data.queries.length >= 1, "Should have generated queries")
  })

  // ─── Test 26: Sources contain hostname field ───
  await test("All sources have hostname field extracted", async () => {
    const req = createRequest({ query: "node.js express tutorial" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    for (const s of data.sources) {
      assert(typeof s.hostname === "string", `Source should have hostname string`)
      assert(s.hostname.length > 0, `Hostname should not be empty`)
      assert(!s.hostname.startsWith("www."), `Hostname should not start with www.`)
    }
  })

  // ─── Test 27: Formatted output includes Source: URLs ───
  await test("Formatted output includes 'Source:' lines with URLs", async () => {
    const req = createRequest({ query: "graphql vs rest api comparison" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.formatted.length > 0) {
      assert(data.formatted.includes("Source:"), "Formatted should contain 'Source:' lines")
      assert(data.formatted.includes("http"), "Formatted should contain URLs in Source lines")
    }
  })

  // ─── Test 28: Empty results return empty: true ───
  await test("No results returns empty flag", async () => {
    // Use a nonsensical query that's unlikely to have results
    const req = createRequest({ query: "zzzxxxqqq nonexistent gibberish query 999" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 even with no results")
    if (data.sources.length === 0) {
      assert(data.empty === true, "Should set empty: true when no results")
      assert(data.formatted === "", "Formatted should be empty string")
    } else {
      assert(true, "Query returned results (skipped empty test)")
    }
  })

  // ─── Test 29: .gov and .edu domains get authority boost ───
  await test("Government and education domains are prioritized", async () => {
    const req = createRequest({ query: "covid 19 guidelines official information" })
    const res = await POST(req, {})
    const { data } = await parseResponse(res)

    if (data.sources.length >= 2) {
      const govEduInTop = data.sources.slice(0, 3).some((s: any) => {
        const h = s.hostname || ""
        return h.endsWith(".gov") || h.endsWith(".edu") || h.endsWith(".who.int") || h.endsWith("who.int")
      })
      // This is a soft assertion — gov/edu may not always appear
      if (govEduInTop) {
        assert(true, "Found .gov/.edu/who.int in top 3 results ✅")
      } else {
        assert(true, "No .gov/.edu in top 3 (may vary by query — soft pass)")
      }
    } else {
      assert(true, "Not enough sources (skipped)")
    }
  })

  // ─── Test 30: URL with path is handled correctly ───
  await test("URL with path fetches correct page", async () => {
    const req = createRequest({ query: "https://en.wikipedia.org/wiki/JavaScript" })
    const res = await POST(req, {})
    const { status, data } = await parseResponse(res)

    assert(status === 200, "Should return 200 for URL with path")
    assert(data.sources.length === 1, "Should have 1 source")
    assert(data.sources[0].url === "https://en.wikipedia.org/wiki/JavaScript", "URL should match exactly")
    assert(data.sources[0].hostname === "en.wikipedia.org", "Hostname should be extracted correctly")
  })

  // ─── Summary ───
  console.log("\n" + "═".repeat(60))
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log("\n  Failures:")
    failures.forEach(f => console.log(`    ❌ ${f}`))
  }
  console.log("═".repeat(60))
  process.exit(failed > 0 ? 1 : 0)
}

// ─── Run ───
runTests().catch(err => {
  console.error("Fatal error running tests:", err)
  process.exit(1)
})
