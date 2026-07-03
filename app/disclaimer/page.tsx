"use client"

import { AlertTriangle } from "lucide-react"

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
          <AlertTriangle className="h-6 w-6 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Data & Performance Disclaimer</h1>
        <p className="mt-2 text-muted-foreground">
          Important information about system reliability, data handling, and performance expectations.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">System Reliability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The system can fail for innumerable reasons. Exploro OS Private is actively being improved. While we strive for high availability and accuracy, no AI system is perfect. Results may vary based on document quality, prompt specificity, network conditions, and third-party service availability.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Data Handling</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your data is encrypted and isolated per workspace. Temporary memory is cleared after use. However, users are responsible for verifying outputs before making business decisions. We recommend keeping backups of critical documents.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Accuracy & Hallucinations</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Even with source citations, AI-generated content can contain errors or misinterpretations. Always review AI outputs. Estimated accuracy ranges: simple lookups 90-95%+, summarization 90-98%, cross-document reasoning 85-95%, complex inference is highly data-dependent.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">No Guaranteed Uptime</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not guarantee 100% uptime. Scheduled maintenance, model updates, and unexpected issues may cause temporary disruptions. We will communicate planned downtime in advance when possible.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Liability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Exploro and Secretes Corp DBA Urbanseed are not liable for decisions made based on AI-generated content. Users assume full responsibility for how outputs are used, shared, or acted upon within their organization.
          </p>
        </section>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-muted-foreground">
          Last updated: June 2026 · Exploro OS – A Product of Secretes Corp DBA Urbanseed
        </div>
      </div>
    </div>
  )
}
