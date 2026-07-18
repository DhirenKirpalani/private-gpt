import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Exploro OS terms of service — subscription terms, usage policies, acceptable use, and cancellation policy.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Exploro",
    description: "Subscription terms, usage policies, and cancellation policy.",
    url: "/terms",
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
