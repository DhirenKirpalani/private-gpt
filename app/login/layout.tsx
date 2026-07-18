import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Exploro OS account to access your AI-powered business workspace.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Log In | Exploro",
    description: "Access your AI-powered business workspace.",
    url: "/login",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
