import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Exploro OS disclaimer — limitations of AI-generated content, accuracy expectations, and user responsibility.",
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: "Disclaimer | Exploro",
    description: "Limitations of AI-generated content and user responsibility.",
    url: "/disclaimer",
  },
}

export default function DisclaimerLayout({ children }: { children: React.ReactNode }) {
  return children
}
