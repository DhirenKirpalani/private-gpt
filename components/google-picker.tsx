"use client"

import { useCallback, useEffect, useState } from "react"

declare global {
  interface Window {
    google?: {
      picker?: {
        PickerBuilder: any
        View: any
        ViewId: any
        DocsViewMode: any
        Feature: any
      }
    }
    gapi?: {
      load: (api: string, callback: () => void) => void
    }
  }
}

let pickerLoaded = false

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

export type PickedFile = {
  id: string
  name: string
  mimeType: string
  size?: number
}

export function useGooglePicker() {
  const [loading, setLoading] = useState(false)

  const openPicker = useCallback(
    async (accessToken: string, onPicked: (files: PickedFile[]) => void) => {
      if (!accessToken) {
        console.error("[Google Picker] No access token provided")
        return
      }

      setLoading(true)
      try {
        await loadPickerScript()

        if (!window.google?.picker) {
          throw new Error("Google Picker API not available")
        }

        const { PickerBuilder, View, ViewId, DocsViewMode, Feature } = window.google.picker

        const view = new View(ViewId.DOCS)
        view.setMode(DocsViewMode.LIST)

        const builder = new PickerBuilder()
          .addView(view)
          .addView(new View(ViewId.DOCS_IMAGES))
          .enableFeature(Feature.MULTISELECT_ENABLED)
          .setOAuthToken(accessToken)
          .setCallback((data: any) => {
            if (data.action === "picked" && data.docs && data.docs.length > 0) {
              const files: PickedFile[] = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
              }))
              onPicked(files)
            }
          })

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
