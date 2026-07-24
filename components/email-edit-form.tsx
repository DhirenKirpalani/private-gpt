"use client"

import { useState } from "react"
import { X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailEditFormProps {
  initialTo: string
  initialCc?: string
  initialBcc?: string
  initialSubject: string
  initialBody: string
  onSave: (edited: { to: string; cc?: string; bcc?: string; subject: string; body: string }) => void
  onCancel: () => void
}

export function EmailEditForm({
  initialTo,
  initialCc = "",
  initialBcc = "",
  initialSubject,
  initialBody,
  onSave,
  onCancel,
}: EmailEditFormProps) {
  const [to, setTo] = useState(initialTo)
  const [cc, setCc] = useState(initialCc)
  const [bcc, setBcc] = useState(initialBcc)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/30"

  return (
    <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-300">Edit email before sending</p>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">To</label>
        <input
          className={field}
          type="text"
          placeholder="recipient@example.com, another@example.com"
          value={to}
          onChange={e => setTo(e.target.value)}
          disabled={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">CC</label>
          <input
            className={field}
            type="text"
            placeholder="cc@example.com (optional)"
            value={cc}
            onChange={e => setCc(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">BCC</label>
          <input
            className={field}
            type="text"
            placeholder="bcc@example.com (optional)"
            value={bcc}
            onChange={e => setBcc(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Subject</label>
        <input
          className={field}
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          disabled={false}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Message</label>
        <textarea
          className={cn(field, "min-h-[140px] resize-y font-mono text-xs leading-relaxed")}
          placeholder="Email body..."
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={false}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          Back
        </button>
        <button
          onClick={() => onSave({
            to: to.trim(),
            cc: cc.trim() || undefined,
            bcc: bcc.trim() || undefined,
            subject: subject.trim(),
            body,
          })}
          disabled={!to.trim() || !subject.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Save Changes
        </button>
      </div>
    </div>
  )
}
