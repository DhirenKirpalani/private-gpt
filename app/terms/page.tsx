"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { FileText, Scale, Clock, Globe, Shield, CreditCard, AlertTriangle, Ban, UserCheck, List, BrainCircuit, Store, Layers, Wallet, Gift, X, Lock, TriangleAlert, Mail } from "lucide-react"

const sections = {
  en: [
    { icon: FileText, title: "1. DEFINITIONS", body: `"Exploro OS" means Exploro OS, its parent companies, subsidiaries, affiliates, successors, and assigns. "User" means any individual or entity accessing or using the Platform. "Content" means text, images, audio, video, software, workflows, prompts, data, and other materials. "AI Services" means any artificial intelligence, machine learning, recommendation engines, automation systems, or language model services available through the Platform. "Third-Party Services" means services, software, APIs, websites, or platforms operated by external providers.` },
    { icon: UserCheck, title: "2. ELIGIBILITY", body: `Users must be at least eighteen (18) years old or the age of majority in their jurisdiction, have legal capacity to enter into binding agreements, and use the Platform in compliance with applicable laws and regulations. If accessing the Platform on behalf of a company or organization, you represent that you have authority to bind that entity.` },
    { icon: Shield, title: "3. ACCOUNT REGISTRATION", body: `Users may be required to create an account. Users agree to provide accurate and complete information, maintain current account information, protect login credentials, and notify Exploro OS of unauthorized account activity. Users are responsible for all activity occurring under their accounts.` },
    { icon: Layers, title: "4. PLATFORM SERVICES", body: `Exploro OS may provide: AI tool discovery and recommendations, AI workflow generation, educational content and tutorials, AI implementation guidance, automation solutions, productivity and business tools, marketplace services, community features, analytics and reporting tools, and third-party integrations. Exploro OS reserves the right to modify, suspend, or discontinue any service at any time.` },
    { icon: Ban, title: "5. ACCEPTABLE USE", body: `Users agree not to violate any law or regulation, upload unlawful, harmful, fraudulent, defamatory, or deceptive content, infringe intellectual property rights, attempt unauthorized access to systems, interfere with Platform operations, reverse engineer or copy proprietary technology, circumvent security measures, use the Platform for spam, phishing, malware, or abusive conduct, or use AI outputs to knowingly generate illegal content. Exploro OS may suspend or terminate accounts that violate these Terms.` },
    { icon: BrainCircuit, title: "6. ARTIFICIAL INTELLIGENCE SERVICES", body: `Users acknowledge that AI outputs are generated automatically, responses may contain errors, omissions, inaccuracies, or outdated information, AI-generated content should be independently verified, and AI recommendations are provided for informational purposes only. Exploro OS does not guarantee accuracy, completeness, reliability, or suitability of AI-generated outputs.` },
    { icon: AlertTriangle, title: "7. NO PROFESSIONAL ADVICE", body: `The Platform does not provide legal advice, medical advice, financial advice, investment advice, tax advice, or regulatory advice. Users should consult qualified professionals before making decisions based on Platform outputs.` },
    { icon: Store, title: "8. THIRD-PARTY SERVICES", body: `The Platform may integrate with external services and providers. Exploro OS does not control third-party services, does not guarantee third-party availability, and is not responsible for third-party content, actions, pricing, policies, or performance. Use of third-party services is subject to the terms of those providers.` },
    { icon: CreditCard, title: "9. AFFILIATE DISCLOSURE", body: `Exploro OS may receive compensation, commissions, referral fees, sponsorships, or other consideration from certain third-party providers featured on the Platform. Such compensation may influence how services, tools, products, or providers are displayed, ranked, or promoted. Exploro OS strives to provide objective recommendations but makes no representation that listings are exhaustive or unbiased.` },
    { icon: FileText, title: "10. USER CONTENT", body: `Users retain ownership of content they submit. By submitting content, users grant Exploro OS a worldwide, non-exclusive, royalty-free license to store, process, display, reproduce, modify, and analyze such content solely for operating, improving, securing, and providing the Platform. Users represent that they possess all necessary rights to submitted content.` },
    { icon: Lock, title: "11. INTELLECTUAL PROPERTY", body: `Exploro OS and its licensors retain all rights, title, and interest in software, algorithms, databases, trademarks, branding, workflows, platform designs, documentation, and proprietary technologies. No ownership rights are transferred to users.` },
    { icon: Wallet, title: "12. SUBSCRIPTIONS AND PAYMENTS", body: `Certain services may require payment. Users agree to pay all applicable fees, provide accurate billing information, and authorize recurring charges where applicable. Fees are generally non-refundable unless required by law or expressly stated otherwise. Exploro OS may change pricing upon reasonable notice.` },
    { icon: Gift, title: "13. FREE TRIALS", body: `Upon signing up, users are assigned a fifteen (15) day free trial of the Solo plan. During the trial period, users have access to all features included in their assigned plan. No payment information is required to start the trial. Unless the user subscribes to a paid plan before the trial period ends, the account will automatically revert to limited functionality after the fifteen (15) day period. Users are responsible for reviewing applicable pricing before trial expiration.` },
    { icon: X, title: "14. TERMINATION", body: `Exploro OS may suspend or terminate access for violations of these Terms, security concerns, fraudulent activity, to comply with legal obligations, or for operational reasons. Users may terminate their accounts at any time. Certain provisions survive termination, including intellectual property, liability limitations, dispute resolution, and indemnification obligations.` },
    { icon: TriangleAlert, title: "15. DISCLAIMERS", body: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXPOLORO OS DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, AND AVAILABILITY. Exploro OS does not guarantee uninterrupted or error-free operation.` },
    { icon: Scale, title: "16. LIMITATION OF LIABILITY", body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXPLORO OS SHALL NOT BE LIABLE FOR INDIRECT DAMAGES, INCIDENTAL DAMAGES, SPECIAL DAMAGES, CONSEQUENTIAL DAMAGES, LOSS OF PROFITS, LOSS OF DATA, BUSINESS INTERRUPTION, OR REPUTATIONAL HARM. IN NO EVENT SHALL EXPLORO OS'S TOTAL LIABILITY EXCEED THE AMOUNT PAID BY THE USER DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.` },
    { icon: Shield, title: "17. INDEMNIFICATION", body: `Users agree to defend, indemnify, and hold harmless Exploro OS and its officers, directors, employees, contractors, affiliates, and partners from claims arising from user conduct, user content, violations of these Terms, violations of law, or infringement of third-party rights.` },
    { icon: Lock, title: "18. PRIVACY", body: `Use of the Platform is subject to the Exploro OS Privacy Policy and AI Privacy & Usage Terms, which are incorporated by reference.` },
    { icon: Globe, title: "19. FORCE MAJEURE", body: `Exploro OS shall not be liable for delays or failures resulting from causes beyond its reasonable control, including natural disasters, internet failures, government actions, labor disputes, cyberattacks, and utility outages.` },
    { icon: Scale, title: "20. GOVERNING LAW", body: `These Terms shall be governed by and construed under the laws of Mexico without regard to conflict of law principles.` },
    { icon: Mail, title: "21. DISPUTE RESOLUTION", body: `Any dispute arising from these Terms shall first be addressed through good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration or competent courts located in Mexico City unless prohibited by applicable law.` },
    { icon: Clock, title: "22. CHANGES TO TERMS", body: `Exploro OS may update these Terms periodically. Material changes will be communicated through the Platform or other reasonable means. Continued use of the Platform constitutes acceptance of updated Terms.` },
    { icon: FileText, title: "23. CONTACT INFORMATION", body: `Questions regarding these Terms may be directed to: earth@urbanseed.net.` },
  ],
  es: [
    { icon: FileText, title: "1. DEFINICIONES", body: `"Exploro OS" significa Exploro OS, sus empresas matrices, subsidiarias, afiliadas, sucesores y cesionarios. "Usuario" significa cualquier persona física o jurídica que acceda o utilice la Plataforma.` },
    { icon: UserCheck, title: "2. ELEGIBILIDAD", body: `Los usuarios deben tener al menos dieciocho (18) años de edad o la mayoría de edad en su jurisdicción, tener capacidad legal para celebrar acuerdos vinculantes y utilizar la Plataforma de conformidad con las leyes y regulaciones aplicables.` },
    { icon: Shield, title: "3. REGISTRO DE CUENTA", body: `Los usuarios pueden necesitar crear una cuenta. Los usuarios aceptan proporcionar información precisa y completa, mantener la información de la cuenta actualizada, proteger las credenciales de inicio de sesión y notificar a Exploro OS de cualquier actividad no autorizada.` },
    { icon: Layers, title: "4. SERVICIOS DE LA PLATAFORMA", body: `Exploro OS puede proporcionar: descubrimiento de herramientas de IA, generación de flujos de trabajo, contenido educativo, orientación de implementación, soluciones de automatización, herramientas de negocio, servicios de mercado, funciones comunitarias, análisis e integraciones de terceros.` },
    { icon: Ban, title: "5. USO ACEPTABLE", body: `Los usuarios aceptan no violar ninguna ley o regulación, cargar contenido ilegal, dañino, fraudulento o difamatorio, infringir derechos de propiedad intelectual, intentar acceso no autorizado a sistemas, interferir con las operaciones de la Plataforma o usar la Plataforma para spam, phishing o conducta abusiva.` },
    { icon: BrainCircuit, title: "6. SERVICIOS DE INTELIGENCIA ARTIFICIAL", body: `Los usuarios reconocen que los resultados de IA se generan automáticamente, las respuestas pueden contener errores u omisiones, el contenido generado por IA debe verificarse independientemente y las recomendaciones de IA se proporcionan solo con fines informativos.` },
    { icon: AlertTriangle, title: "7. SIN ASESORAMIENTO PROFESIONAL", body: `La Plataforma no proporciona asesoramiento legal, médico, financiero, de inversión, fiscal o regulatorio. Los usuarios deben consultar profesionales calificados antes de tomar decisiones basadas en los resultados de la Plataforma.` },
    { icon: Store, title: "8. SERVICIOS DE TERCEROS", body: `La Plataforma puede integrarse con servicios externos. Exploro OS no controla los servicios de terceros, no garantiza su disponibilidad y no es responsable del contenido, acciones, precios, políticas o rendimiento de terceros.` },
    { icon: CreditCard, title: "9. DIVULGACIÓN DE AFILIADOS", body: `Exploro OS puede recibir compensación de ciertos proveedores de terceros presentados en la Plataforma. Dicha compensación puede influir en cómo se muestran, clasifican o promueven los servicios, herramientas o productos.` },
    { icon: FileText, title: "10. CONTENIDO DEL USUARIO", body: `Los usuarios retienen la propiedad del contenido que envían. Al enviar contenido, los usuarios otorgan a Exploro OS una licencia mundial, no exclusiva y libre de regalías para almacenar, procesar, mostrar, reproducir, modificar y analizar dicho contenido.` },
    { icon: Lock, title: "11. PROPIEDAD INTELECTUAL", body: `Exploro OS y sus licenciantes retienen todos los derechos, título e interés en el software, algoritmos, bases de datos, marcas comerciales, flujos de trabajo, diseños de la plataforma y tecnologías propietarias.` },
    { icon: Wallet, title: "12. SUSCRIPCIONES Y PAGOS", body: `Ciertos servicios pueden requerir pago. Los usuarios aceptan pagar todas las tarifas aplicables, proporcionar información de facturación precisa y autorizar cargos recurrentes cuando corresponda. Las tarifas generalmente no son reembolsables.` },
    { icon: Gift, title: "13. PRUEBAS GRATUITAS", body: `Al registrarse, los usuarios reciben una prueba gratuita de quince (15) días del plan Solo. Durante el período de prueba, los usuarios tienen acceso a todas las funciones incluidas en su plan asignado. No se requiere información de pago para iniciar la prueba. A menos que el usuario se suscriba a un plan de pago antes de que finalice el período de prueba, la cuenta revertirá automáticamente a funcionalidad limitada después de los quince (15) días. Los usuarios son responsables de revisar los precios aplicables antes de la expiración de la prueba.` },
    { icon: X, title: "14. TERMINACIÓN", body: `Exploro OS puede suspender o terminar el acceso por violaciones de estos Términos, preocupaciones de seguridad, actividad fraudulenta, para cumplir con obligaciones legales o por razones operativas.` },
    { icon: TriangleAlert, title: "15. EXENCIONES DE RESPONSABILIDAD", body: `LA PLATAFORMA SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD". EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, EXPLORO OS RENUNCIA A TODAS LAS GARANTÍAS, INCLUYENDO COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR, NO INFRACCIÓN, EXACTITUD, CONFIABILIDAD Y DISPONIBILIDAD.` },
    { icon: Scale, title: "16. LIMITACIÓN DE RESPONSABILIDAD", body: `EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, EXPLORO OS NO SERÁ RESPONSABLE DE DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES, PÉRDIDA DE BENEFICIOS, PÉRDIDA DE DATOS, INTERRUPCIÓN COMERCIAL O DAÑO A LA REPUTACIÓN.` },
    { icon: Shield, title: "17. INDEMNIZACIÓN", body: `Los usuarios aceptan defender, indemnizar y mantener indemne a Exploro OS y sus oficiales, directores, empleados, contratistas, afiliados y socios de reclamos derivados de la conducta del usuario, el contenido del usuario o violaciones de estos Términos.` },
    { icon: Lock, title: "18. PRIVACIDAD", body: `El uso de la Plataforma está sujeto a la Política de Privacidad de Exploro OS y a los Términos de Uso y Privacidad de IA, que se incorporan por referencia.` },
    { icon: Globe, title: "19. FUERZA MAYOR", body: `Exploro OS no será responsable de retrasos o fallas resultantes de causas fuera de su control razonable, incluyendo desastres naturales, fallas de internet, acciones gubernamentales, disputas laborales, ciberataques y cortes de servicios públicos.` },
    { icon: Scale, title: "20. LEY APLICABLE", body: `Estos Términos se regirán e interpretarán de acuerdo con las leyes de México sin considerar los principios de conflicto de leyes.` },
    { icon: Mail, title: "21. RESOLUCIÓN DE DISPUTAS", body: `Cualquier disputa derivada de estos Términos se abordará primero a través de una negociación de buena fe. Si no se resuelve, las disputas se someterán a arbitraje vinculante o tribunales competentes ubicados en la Ciudad de México.` },
    { icon: Clock, title: "22. CAMBIOS EN LOS TÉRMINOS", body: `Exploro OS puede actualizar estos Términos periódicamente. Los cambios materiales se comunicarán a través de la Plataforma u otros medios razonables. El uso continuo de la Plataforma constituye la aceptación de los Términos actualizados.` },
    { icon: FileText, title: "23. INFORMACIÓN DE CONTACTO", body: `Las preguntas sobre estos Términos pueden dirigirse a: earth@urbanseed.net.` },
  ],
}

export default function TermsPage() {
  const { lang } = useI18n()
  const content = sections[lang as keyof typeof sections] || sections.en

  return (
    <div className="min-h-screen bg-background py-20 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {lang === "es" ? "Términos de Servicio" : "Terms of Service"}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "es" ? "Fecha de entrada en vigor: 15 de junio de 2026" : "Effective Date: June 15, 2026"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground max-w-xl mx-auto">
            {lang === "es"
              ? "Estos Términos de Servicio rigen el acceso y uso de la plataforma Exploro OS, sitios web, aplicaciones móviles, API, software, servicios de inteligencia artificial, recursos educativos y productos y servicios relacionados."
              : "These Terms of Service govern access to and use of the Exploro OS platform, websites, mobile applications, APIs, software, artificial intelligence services, educational resources, and related products and services."}
          </p>
        </div>

        <div className="space-y-8">
          {content.map((section, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:bg-card/70",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15">
                  <section.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-600/5 p-6 text-center">
          <p className="text-sm text-emerald-400">
            If you have any questions about these Terms of Service, please contact us at{" "}
            <a href="mailto:earth@urbanseed.net" className="underline hover:text-emerald-300">
              earth@urbanseed.net
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
