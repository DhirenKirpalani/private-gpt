import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

export const metadata: Metadata = {
  title: "About Exploro — AI-Powered Business Platform",
  description: "Learn about Exploro OS, the AI-powered business platform built for small and medium businesses. Secure, private, and designed for teams that need verifiable AI.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Exploro — AI-Powered Business Platform",
    description: "Secure, private AI workspace for small and medium businesses.",
    url: "/about",
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "About", item: `${baseUrl}/about` },
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
