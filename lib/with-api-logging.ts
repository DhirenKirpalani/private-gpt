import { logApiRequest } from "./api-logger"

type RouteHandler<T extends Request = Request> = (req: T, ctx: any) => Promise<Response> | Response

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

    let userId: string | null = null
    try {
      const authHeader = req.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7)
        const parts = token.split(".")
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
          userId = payload.sub || null
        }
      }
    } catch { /* ignore */ }

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
