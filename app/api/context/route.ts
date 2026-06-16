import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== "string") return NextResponse.json({ content: "" })

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return NextResponse.json({ content: "" })

    const html = await response.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-zA-Z]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000)

    return NextResponse.json({ content: text })
  } catch {
    return NextResponse.json({ content: "" })
  }
}
