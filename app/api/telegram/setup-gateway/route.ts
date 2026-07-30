import { NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"

// GET — Quick setup endpoint to register the gateway bot webhook
// Call this once after deploying: GET /api/telegram/setup-gateway
async function _GET() {
  const token = process.env.TELEGRAM_GATEWAY_BOT_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_GATEWAY_BOT_TOKEN not set" }, { status: 500 })
  }
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not set" }, { status: 500 })
  }

  const webhookUrl = `${appUrl}/api/telegram/gateway-webhook`
  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=gateway`
  )
  const data = await res.json()

  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 500 })
  }

  // Also get bot info for the frontend
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const meData = await meRes.json()

  return NextResponse.json({
    success: true,
    gatewayBotUsername: meData.result?.username,
    webhookUrl,
  })
}

export const GET = withApiLogging(_GET, "/api/telegram/setup-gateway")
