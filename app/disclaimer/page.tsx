"use client"

import { AlertTriangle } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export default function DisclaimerPage() {
  const { lang } = useI18n()
  const es = lang === "es"
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
          <AlertTriangle className="h-6 w-6 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{es ? "Aviso de Datos y Rendimiento" : "Data & Performance Disclaimer"}</h1>
        <p className="mt-2 text-muted-foreground">
          {es ? "Información importante sobre confiabilidad del sistema, manejo de datos y expectativas de rendimiento." : "Important information about system reliability, data handling, and performance expectations."}
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">{es ? "Confiabilidad del Sistema" : "System Reliability"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {es ? "El sistema puede fallar por innumerables razones. Exploro OS Private está siendo mejorado activamente. Aunque nos esforzamos por alta disponibilidad y precisión, ningún sistema de IA es perfecto. Los resultados pueden variar según la calidad de los documentos, la especificidad de las instrucciones, las condiciones de red y la disponibilidad de servicios de terceros." : "The system can fail for innumerable reasons. Exploro OS Private is actively being improved. While we strive for high availability and accuracy, no AI system is perfect. Results may vary based on document quality, prompt specificity, network conditions, and third-party service availability."}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{es ? "Manejo de Datos" : "Data Handling"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {es ? "Tus datos están cifrados y aislados por espacio de trabajo. La memoria temporal se borra después de su uso. Sin embargo, los usuarios son responsables de verificar los resultados antes de tomar decisiones comerciales. Recomendamos mantener copias de seguridad de documentos críticos." : "Your data is encrypted and isolated per workspace. Temporary memory is cleared after use. However, users are responsible for verifying outputs before making business decisions. We recommend keeping backups of critical documents."}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{es ? "Precisión y Alucinaciones" : "Accuracy & Hallucinations"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {es ? "Incluso con citas de fuentes, el contenido generado por IA puede contener errores o interpretaciones erróneas. Siempre revisa los resultados de IA. Rangos de precisión estimados: búsquedas simples 90-95%+, resúmenes 90-98%, razonamiento entre documentos 85-95%, inferencia compleja es altamente dependiente de los datos." : "Even with source citations, AI-generated content can contain errors or misinterpretations. Always review AI outputs. Estimated accuracy ranges: simple lookups 90-95%+, summarization 90-98%, cross-document reasoning 85-95%, complex inference is highly data-dependent."}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{es ? "Sin Garantía de Disponibilidad" : "No Guaranteed Uptime"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {es ? "No garantizamos 100% de disponibilidad. El mantenimiento programado, las actualizaciones de modelos y los problemas inesperados pueden causar interrupciones temporales. Comunicaremos el tiempo de inactividad planificado con anticipación cuando sea posible." : "We do not guarantee 100% uptime. Scheduled maintenance, model updates, and unexpected issues may cause temporary disruptions. We will communicate planned downtime in advance when possible."}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{es ? "Responsabilidad" : "Liability"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {es ? "Exploro y Secretes Corp DBA Urbanseed no son responsables de las decisiones tomadas en base al contenido generado por IA. Los usuarios asumen total responsabilidad de cómo se utilizan, comparten o aplican los resultados dentro de su organización." : "Exploro and Secretes Corp DBA Urbanseed are not liable for decisions made based on AI-generated content. Users assume full responsibility for how outputs are used, shared, or acted upon within their organization."}
          </p>
        </section>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-muted-foreground">
          {es ? "Última actualización: junio 2026 · Exploro OS – Un Producto de Secretes Corp DBA Urbanseed" : "Last updated: June 2026 · Exploro OS – A Product of Secretes Corp DBA Urbanseed"}
        </div>
      </div>
    </div>
  )
}
