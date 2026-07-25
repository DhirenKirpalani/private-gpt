"use client"

import { useCallback, useEffect, useState } from "react"

declare global {
  interface Window {
    google?: {
      picker?: {
        PickerBuilder: any
        View: any
        ViewId: any
        Feature: any
      }
      accounts?: {
        oauth2?: {
          initTokenClient: (config: any) => { requestAccessToken: (opts?: any) => void }
        }
      }
    }
    gapi?: {
      load: (api: string, callback: () => void) => void
    }
  }
}

let pickerLoaded = false
let gisLoaded = false
let cachedToken: string | null = null
let cachedTokenTime = 0

function loadPickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pickerLoaded && window.google?.picker) {
      resolve()
      return
    }
    const existing = document.getElementById("google-picker-script")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Picker API")))
      return
    }
    const script = document.createElement("script")
    script.id = "google-picker-script"
    script.src = "https://apis.google.com/js/api.js"
    script.async = true
    script.defer = true
    script.onload = () => {
      window.gapi?.load("picker", () => {
        pickerLoaded = true
        resolve()
      })
    }
    script.onerror = () => reject(new Error("Failed to load Google Picker API"))
    document.head.appendChild(script)
  })
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gisLoaded && window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const existing = document.getElementById("google-gis-script")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")))
      return
    }
    const script = document.createElement("script")
    script.id = "google-gis-script"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      gisLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(script)
  })
}

function getCachedToken(): string | null {
  // Token expires in 1 hour, check if cached token is still valid (50 min buffer)
  if (cachedToken && Date.now() - cachedTokenTime < 50 * 60 * 1000) {
    return cachedToken
  }
  cachedToken = null
  return null
}

function getFreshToken(): Promise<string> {
  // Return cached token if still valid
  const cached = getCachedToken()
  if (cached) {
    console.log("[Google Picker] Using cached token")
    return Promise.resolve(cached)
  }

  return new Promise((resolve, reject) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      reject(new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID"))
      return
    }

    const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response: any) => {
        if (response.access_token) {
          cachedToken = response.access_token
          cachedTokenTime = Date.now()
          resolve(response.access_token)
        } else {
          reject(new Error("Failed to get access token"))
        }
      },
    })

    tokenClient.requestAccessToken({ prompt: "" })
  })
}

export type PickedFile = {
  id: string
  name: string
  mimeType: string
  size?: number
}

export function useGooglePicker() {
  const [loading, setLoading] = useState(false)

  const openPicker = useCallback(
    async (_serverToken: string, onPicked: (files: PickedFile[], freshToken: string) => void) => {
      setLoading(true)
      try {
        // Load both Picker and GIS scripts
        await Promise.all([loadPickerScript(), loadGisScript()])

        if (!window.google?.picker) {
          throw new Error("Google Picker API not available")
        }
        if (!window.google?.accounts?.oauth2) {
          throw new Error("Google Identity Services not available")
        }

        // Get a fresh browser-side token with drive.file scope
        // This token properly grants access to files the user picks
        const freshToken = await getFreshToken()
        console.log("[Google Picker] Got fresh token:", `${freshToken.slice(0, 10)}...`)

        const { PickerBuilder, View, ViewId, Feature } = window.google.picker
        const devKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
        console.log("[Google Picker] Dev key loaded:", !!devKey)

        const view = new View(ViewId.DOCS)

        const builder = new PickerBuilder()
          .addView(view)
          .addView(new View(ViewId.DOCS_IMAGES))
          .enableFeature(Feature.MULTISELECT_ENABLED)
          .setOAuthToken(freshToken)
          .setCallback((data: any) => {
            console.log("[Google Picker] Callback:", data.action, data.docs ? data.docs.map((d: any) => ({ id: d.id, name: d.name })) : null)
            if (data.action === "picked" && data.docs && data.docs.length > 0) {
              const files: PickedFile[] = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
              }))
              console.log("[Google Picker] Picked files:", JSON.stringify(files))
              onPicked(files, freshToken)
            }
          })

        // setOrigin is required for non-Google domains and localhost
        const origin = window.location.origin
        if (typeof builder.setOrigin === "function") {
          builder.setOrigin(origin)
        }

        // Add developer key if available
        if (devKey && typeof builder.setDeveloperKey === "function") {
          builder.setDeveloperKey(devKey)
        }

        const picker = builder.build()
        picker.setVisible(true)
      } catch (err) {
        console.error("[Google Picker] Error:", err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { openPicker, loading }
}
