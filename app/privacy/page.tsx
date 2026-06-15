"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { Shield, Globe, FileText, Trash2, Scale, Clock, Database, Eye } from "lucide-react"

const sections = {
  en: [
    {
      icon: Database,
      title: "1. Data Ownership and Control",
      body: `The Client retains full ownership of all customer data, leads, contact lists, and business information uploaded to or processed by The Platform. The Platform claims no intellectual property rights over your private data.`,
      source: "Derived from Section 3 (Intellectual Property and Biometrics) — Client guarantees ownership of provided materials.",
    },
    {
      icon: Shield,
      title: "2. Role as Data Processor",
      body: `The Platform acts exclusively as a Data Processor under applicable privacy laws. The Client remains the Data Controller — solely responsible for data collection legality, consent, and Anti-Spam compliance.`,
      source: 'Section 4 (Limitation of Liability and Data Protection) — "The Agency acts as \'Processor\'... The Client is the \'Controller\'."',
    },
    {
      icon: Eye,
      title: "3. Confidentiality and Access",
      body: `Your private data is never used to train public models or shared with third parties except: (a) as required to deliver the service (e.g., authorized API calls to integrated platforms), or (b) as required by law. Data is encrypted at rest and in transit.`,
      source: "Section 2 (Nature of Results) — References third-party platforms (Stripe, Make.com, etc.) as necessary for service execution.",
    },
    {
      icon: FileText,
      title: "4. Source Transparency (No Hallucination Guarantee)",
      body: `Every output — analysis, report, proposal, email, or projection — clearly distinguishes between: your internal data, external sources (with citations), and AI-generated synthesis. The Client is responsible for reviewing all outputs before use, particularly for legal, financial, or operational decisions.`,
      source: "Section 3 (AI Identification) — Transparency principle applied to data sources.",
    },
    {
      icon: Trash2,
      title: "5. Data Portability and Deletion",
      body: `The Client may export all customer data at any time. Upon cancellation, data will be retained for 30 days, then permanently deleted unless legal retention obligations require otherwise.`,
      source: "Standard best practice under GDPR Article 20 (right to data portability) and Article 17 (right to erasure).",
    },
    {
      icon: Scale,
      title: "6. Limitations of Liability",
      body: `The Platform is not liable for: (a) decisions made by the Client based on AI-generated outputs, (b) service interruptions of third-party integrated platforms, or (c) changes in external algorithms affecting lead generation or email deliverability.`,
      source: "Section 2 (Nature of Results) and Section 4 (Limitation of Liability).",
    },
    {
      icon: Globe,
      title: "7. Jurisdiction and Applicable Law",
      body: `For any dispute arising from this agreement, applicable law depends on the Client's jurisdiction. The Platform complies with the privacy laws of the Client's country of operation to the extent reasonably possible. The Parties submit to the jurisdiction of the courts in Mexico City unless mandatory local laws require otherwise.`,
      source: "Section 6 (Jurisdiction) — expanded to include international compliance.",
    },
    {
      icon: Clock,
      title: "8. Evaluation Period",
      body: `A minimum period of 3 (three) months is established for AI model and workflow stabilization before conducting a final performance audit.`,
      source: "Section 5 (Evaluation Period).",
    },
  ],
  es: [
    {
      icon: Database,
      title: "1. Propiedad y Control de los Datos",
      body: `El Cliente conserva la totalidad de la propiedad sobre todos sus datos de clientes, leads, listas de contactos y cualquier información comercial cargada o procesada por La Plataforma. La Plataforma no reclama derechos de propiedad intelectual sobre sus datos privados.`,
      source: "Derivado de la Sección 3 (Propiedad Intelectual y Biometría) — El Cliente garantiza la propiedad del material proporcionado.",
    },
    {
      icon: Shield,
      title: '2. Rol como Encargado del Tratamiento',
      body: `La Plataforma actúa exclusivamente como "Encargado" del tratamiento de datos conforme a las leyes de privacidad aplicables. El Cliente sigue siendo el "Responsable" — únicamente responsable de la legalidad de la recolección de datos, consentimiento y cumplimiento de normas Anti-Spam.`,
      source: 'Sección 4 (Limitación de Responsabilidad y Protección de Datos) — "La Agencia actúa como \'Encargado\'... El Cliente es el \'Responsable\'."',
    },
    {
      icon: Eye,
      title: "3. Confidencialidad y Acceso",
      body: `Sus datos privados nunca se utilizan para entrenar modelos públicos ni se comparten con terceros, excepto: (a) cuando sea necesario para prestar el servicio (ej. llamadas API a plataformas integradas que usted autorizó), o (b) cuando lo exija la ley. Los datos están cifrados en reposo y en tránsito.`,
      source: "Sección 2 (Naturaleza de los Resultados) — Referencias a plataformas terceras (Stripe, Make.com, etc.) como necesarias para la ejecución del servicio.",
    },
    {
      icon: FileText,
      title: "4. Transparencia de Fuentes (Sin Garantía de Alucinaciones)",
      body: `Cada resultado — análisis, reporte, propuesta, correo o proyección — distingue claramente entre: sus datos internos, fuentes externas (con citas) y síntesis generada por IA. El Cliente es responsable de revisar todos los resultados antes de usarlos, especialmente para decisiones legales, financieras u operativas.`,
      source: "Sección 3 (Identificación de IA) — Principio de transparencia aplicado a fuentes de datos.",
    },
    {
      icon: Trash2,
      title: "5. Portabilidad y Eliminación de Datos",
      body: `El Cliente puede exportar todos sus datos de clientes en cualquier momento. Al cancelar, los datos se conservarán durante 30 días y luego se eliminarán permanentemente, a menos que obligaciones legales de retención requieran lo contrario.`,
      source: "Práctica estándar bajo el Artículo 20 de GDPR (derecho a la portabilidad) y Artículo 17 (derecho al olvido).",
    },
    {
      icon: Scale,
      title: "6. Limitación de Responsabilidad",
      body: `La Plataforma no es responsable por: (a) decisiones tomadas por el Cliente basadas en resultados generados por IA, (b) interrupciones de servicio de plataformas terceras integradas, o (c) cambios en algoritmos externos que afecten la generación de leads o la entregabilidad de correos.`,
      source: "Sección 2 (Naturaleza de los Resultados) y Sección 4 (Limitación de Responsabilidad).",
    },
    {
      icon: Globe,
      title: "7. Jurisdicción y Ley Aplicable",
      body: `Para cualquier controversia derivada de este acuerdo, la ley aplicable depende de la jurisdicción del Cliente. La Plataforma cumplirá con las leyes de privacidad del país de operación del Cliente en la medida razonablemente posible. Las partes se someten a la jurisdicción de los tribunales de la Ciudad de México a menos que leyes locales imperativas requieran lo contrario.`,
      source: "Sección 6 (Jurisdicción) — expandida para incluir cumplimiento internacional.",
    },
    {
      icon: Clock,
      title: "8. Periodo de Evaluación",
      body: `Se establece un periodo mínimo de 3 (tres) meses para la estabilización de modelos de IA y flujos de trabajo antes de realizar una auditoría de rendimiento final.`,
      source: "Sección 5 (Periodo de Evaluación).",
    },
  ],
}

const jurisdictions = {
  en: [
    { law: "LFPDPPP", jurisdiction: "Mexico", applicability: "All clients operating in Mexico" },
    { law: "GDPR (Regulation EU 2016/679)", jurisdiction: "European Union", applicability: "All clients who are EU residents or process EU citizen data" },
    { law: "CCPA/CPRA (Cal. Civ. Code § 1798.100 et seq.)", jurisdiction: "California, USA", applicability: "Clients with California residents in their database" },
    { law: "PIPEDA", jurisdiction: "Canada", applicability: "Clients operating in Canada" },
    { law: "LGPD (Lei Geral de Proteção de Dados)", jurisdiction: "Brazil", applicability: "Clients operating in Brazil" },
  ],
  es: [
    { law: "LFPDPPP", jurisdiction: "México", applicability: "Todos los clientes que operan en México" },
    { law: "GDPR (Reglamento UE 2016/679)", jurisdiction: "Unión Europea", applicability: "Clientes residentes en la UE o que procesan datos de ciudadanos UE" },
    { law: "CCPA/CPRA (Cal. Civ. Code § 1798.100 et seq.)", jurisdiction: "California, EE.UU.", applicability: "Clientes con residentes de California en su base de datos" },
    { law: "PIPEDA", jurisdiction: "Canadá", applicability: "Clientes que operan en Canadá" },
    { law: "LGPD (Lei Geral de Proteção de Dados)", jurisdiction: "Brasil", applicability: "Clientes que operan en Brasil" },
  ],
}

const notices = {
  en: {
    popupTitle: "PRIVATE DATA LEGAL NOTICE",
    intro: "Your customer data is protected under the following applicable laws:",
    rightsTitle: "Your rights (GDPR Art. 17 & 20 / LFPDPPP Art. 22-26):",
    rights: [
      "Full ownership of your data",
      "Export your data at any time",
      "Request permanent deletion within 30 days of cancellation",
    ],
    obligationsTitle: "Platform obligations (LFPDPPP Title II / GDPR Art. 28):",
    obligations: [
      "We act exclusively as Data Processor",
      "You remain the Data Controller",
      "Your data never trains public AI models",
    ],
    transparencyTitle: "Source transparency commitment:",
    transparency: [
      "Every response cites internal vs external sources",
      "External web research includes citations",
      "Minimum hallucinated data, you verify before use",
    ],
    liabilityTitle: "Limitation of liability (Section 4 of Service Agreement):",
    liability: [
      "We are not liable for decisions you make based on AI-generated outputs",
      "We are not liable for third-party platform interruptions",
    ],
    acceptance: "By continuing to use this CRM dashboard, you confirm acceptance of these legal terms.",
    acceptanceBanner: "ACCEPTANCE AND DIGITAL AUTHORIZATION — By signing up, contracting services, and/or making payment, the Client declares that: (1) they have read and fully understand this Private Data Disclaimer, (2) they authorize the use of AI technologies for data processing with business purposes, and (3) their electronic registration constitutes a binding signature under applicable e-commerce laws.",
  },
  es: {
    popupTitle: "AVISO LEGAL DE DATOS PRIVADOS",
    intro: "Tus datos están protegidos bajo las siguientes leyes aplicables:",
    rightsTitle: "Tus derechos (GDPR Art. 17 & 20 / LFPDPPP Art. 22-26):",
    rights: [
      "Propiedad total de sus datos",
      "Exportación y eliminación en cualquier momento",
      "Tus datos nunca entrenan modelos públicos de IA",
    ],
    obligationsTitle: "Responsabilidad de La Plataforma:",
    obligations: [
      "Actuamos solo como procesadora de datos",
      "Cada respuesta cita fuentes internas y externas",
      "No somos responsables por resultados generados por tu agente de IA",
    ],
    transparencyTitle: "Transparencia de fuentes:",
    transparency: [
      "Cada resultado cita fuentes internas vs externas",
      "Investigación web externa incluye citas",
      "Datos alucinados mínimos, verifíquelos antes de usarlos",
    ],
    liabilityTitle: "Limitación de responsabilidad (Sección 4 del Acuerdo de Servicio):",
    liability: [
      "No somos responsables por decisiones basadas en resultados generados por IA",
      "No somos responsables por interrupciones de plataformas de terceros",
    ],
    acceptance: "Al continuar usando el CRM, estás confirmando y aceptas estos términos.",
    acceptanceBanner: "ACEPTACIÓN Y AUTORIZACIÓN DIGITAL — Al registrarse, contratar servicios y/o realizar el pago, el Cliente declara que: (1) ha leído y comprende en su totalidad este Aviso de Datos Privados, (2) autoriza el uso de tecnologías de IA para el procesamiento de datos con fines comerciales, y (3) su registro electrónico constituye una firma vinculante conforme a las leyes aplicables de comercio electrónico.",
  },
}

export default function PrivacyPage() {
  const { lang } = useI18n()
  const t = sections[lang as "en" | "es"]
  const j = jurisdictions[lang as "en" | "es"]
  const n = notices[lang as "en" | "es"]

  return (
    <>
        {/* Hero */}
        <section className="border-b border-white/5 bg-[#1a1f2e] py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-6 flex items-center gap-3">
              <Shield className="h-8 w-8 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{lang === "en" ? "Legal" : "Legal"}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {lang === "en" ? "International Data Protection Disclaimer" : "Aviso de Datos Privados: Protección de Clientes y Leads"}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {lang === "en"
                ? "Exploro OS (\"The Platform\") provides private GPT services, data analysis, reporting, and AI-assisted communication tools. This disclaimer governs how your customer data, leads, and business information are processed, stored, and protected."
                : 'Exploro OS ("La Plataforma") proporciona servicios de GPT privado, análisis de datos, reportes y herramientas de comunicación asistidas por IA. Este aviso rige la forma en que sus datos de clientes, leads e información comercial son procesados, almacenados y protegidos.'}
            </p>
          </div>
        </section>

        {/* Sections */}
        <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <div className="space-y-8">
            {t.map((section, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-[#1e2330] p-6 md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10">
                    <section.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                <p className="mt-3 text-xs italic text-muted-foreground/60">{section.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Jurisdiction Table */}
        <section className="border-y border-white/5 bg-[#1a1f2e] py-12 md:py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="mb-8 text-xl font-semibold text-white">
              {lang === "en" ? "Applicable Privacy Laws by Jurisdiction" : "Leyes de Privacidad Aplicables por Jurisdicción"}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-[#252b3a]">
                    <th className="px-4 py-3 text-left font-semibold text-white">{lang === "en" ? "Law" : "Ley"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">{lang === "en" ? "Jurisdiction" : "Jurisdicción"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">{lang === "en" ? "Applicability" : "Aplicabilidad"}</th>
                  </tr>
                </thead>
                <tbody>
                  {j.map((row, i) => (
                    <tr key={i} className={cn("border-b border-white/5", i % 2 === 0 ? "bg-[#1e2330]" : "bg-[#1a1f2e]")}>
                      <td className="px-4 py-3 font-medium text-emerald-400">{row.law}</td>
                      <td className="px-4 py-3 text-white">{row.jurisdiction}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.applicability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CRM Pop-up Notice */}
        <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <h2 className="mb-8 text-xl font-semibold text-white">
            {lang === "en" ? "CRM Dashboard Notice" : "Aviso del Panel de CRM"}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-[#1e2330] p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">{n.popupTitle}</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{n.intro}</p>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {j.map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="text-muted-foreground">{row.jurisdiction}: <span className="text-white">{row.law}</span></span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">{n.rightsTitle}</h4>
                <ul className="space-y-1">
                  {n.rights.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">{n.obligationsTitle}</h4>
                <ul className="space-y-1">
                  {n.obligations.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">{n.transparencyTitle}</h4>
                <ul className="space-y-1">
                  {n.transparency.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-white">{n.liabilityTitle}</h4>
                <ul className="space-y-1">
                  {n.liability.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-600/5 p-4">
              <p className="text-sm text-emerald-400">{n.acceptance}</p>
            </div>
          </div>
        </section>

        {/* Acceptance Banner */}
        <section className="border-t border-white/5 bg-[#1a1f2e] py-8">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-white/10 bg-[#1e2330] p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{n.acceptanceBanner}</p>
            </div>
          </div>
        </section>
    </>
  )
}
