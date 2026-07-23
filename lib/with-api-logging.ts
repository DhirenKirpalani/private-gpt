import { logApiRequest } from "./api-logger"

type RouteHandler<T extends Request = Request> = (req: T, ctx: any) => Promise<Response> | Response

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // 1. Try Authorization Bearer token (JWT)
  try {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      const parts = token.split(".")
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
        if (payload.sub) return payload.sub
      }
    }
  } catch { /* ignore */ }

  // 2. Try extracting from Supabase session cookie
  try {
    const cookieHeader = req.headers.get("cookie") || ""
    if (cookieHeader) {
      // Parse cookies manually
      const cookies: Record<string, string> = {}
      for (const part of cookieHeader.split(";")) {
        const [key, ...val] = part.trim().split("=")
        if (key && val.length) cookies[key] = val.join("=")
      }
      // Supabase stores session in sb-<ref>-auth-token or supabase-auth-token cookie
      const tokenKeys = Object.keys(cookies).filter(k =>
        k.includes("auth-token") || k.startsWith("sb-")
      )
      for (const key of tokenKeys) {
        const raw = cookies[key]
        if (!raw) continue
        try {
          // Try URL decode first
          const decoded = decodeURIComponent(raw)
          const parsed = JSON.parse(decoded)
          if (parsed?.access_token) {
            const parts = parsed.access_token.split(".")
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
              if (payload.sub) return payload.sub
            }
          }
        } catch {
          // Might be a base64 token directly
          try {
            const parts = raw.split(".")
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
              if (payload.sub) return payload.sub
            }
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }

  // 3. Try reading userId from request body (some routes send it)
  try {
    const cloned = req.clone()
    const body = await cloned.json()
    if (body?.userId) return body.userId
  } catch { /* not JSON or no userId */ }

  return null
}

export function withApiLogging<T extends Request = Request>(
  handler: RouteHandler<T>,
  endpointLabel?: string
): RouteHandler<T> {
  return (async (req: T, ctx: any) => {
    const start = Date.now()
    const endpoint = endpointLabel || new URL(req.url).pathname
    const method = req.method
    const userAgent = req.headers.get("user-agent") || null
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || null

    const userId = await getUserIdFromRequest(req)

    try {
      const res = await handler(req, ctx)
      const durationMs = Date.now() - start
      const statusCode = res.status

      logApiRequest({
        userId,
        method,
        endpoint,
        statusCode,
        durationMs,
        userAgent,
        ipAddress,
      })

      return res
    } catch (err: any) {
      const durationMs = Date.now() - start
      logApiRequest({
        userId,
        method,
        endpoint,
        statusCode: 500,
        durationMs,
        error: err?.message || "Internal Server Error",
        userAgent,
        ipAddress,
      })
      throw err
    }
  }) as RouteHandler<T>
}
