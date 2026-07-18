import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Exploro OS privacy policy — how we handle your data, encryption standards, data retention, and your rights.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Exploro",
    description: "How Exploro handles your data, encryption standards, and your rights.",
    url: "/privacy",
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
