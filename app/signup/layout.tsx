import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up — Start Your 15-Day Free Trial",
  description: "Create your Exploro OS account and start a 15-day free trial. No credit card required. AI-powered document management, CRM, email, and team workflows.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sign Up — 15-Day Free Trial | Exploro",
    description: "Start your 15-day free trial. No credit card required.",
    url: "/signup",
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
