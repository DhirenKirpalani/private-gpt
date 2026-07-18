import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

export const metadata: Metadata = {
  title: "Pricing — Solo & Team Plans",
  description: "Exploro pricing: Solo plan at $30/month and Team plan at $50/month per seat. 15-day free trial, no credit card required. Cancel anytime.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Exploro Pricing — Solo & Team Plans",
    description: "Solo plan at $30/month. Team plan at $50/month per seat. 15-day free trial.",
    url: "/pricing",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Pricing",
        item: `${baseUrl}/pricing`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  )
}
