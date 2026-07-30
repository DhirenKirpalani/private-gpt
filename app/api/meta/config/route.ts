import { NextResponse } from "next/server"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _GET() {
  return NextResponse.json({
    appId: process.env.META_APP_ID || "",
  })
}

export const GET = withApiLogging(_GET, "/api/meta/config")
