import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { withApiLogging } from "@/lib/with-api-logging"

export const dynamic = "force-dynamic"

async function _POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Ensure bucket exists
    const { error: bucketError } = await supabase.storage.getBucket("chat-media")
    if (bucketError) {
      const { error: createError } = await supabase.storage.createBucket("chat-media", { public: true })
      if (createError) {
        console.error("[UPLOAD MEDIA] Failed to create bucket:", createError)
      }
    }

    const ext = file.type.split("/")[1] || "bin"
    const fileName = `${userId}/sent_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error("[UPLOAD MEDIA]", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(fileName)

    return NextResponse.json({ success: true, mediaUrl: urlData.publicUrl })
  } catch (err: any) {
    console.error("[UPLOAD MEDIA]", err)
    return NextResponse.json({ error: err?.message || "Failed to upload" }, { status: 500 })
  }
}

export const POST = withApiLogging(_POST, "/api/upload-media")
