import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthProvider } from "./auth-provider";
import { WorkspaceProvider } from "./workspace-provider";

const inter = Inter({ subsets: ["latin"] });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0f1a",
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Exploro — AI-Powered Business Platform for SMBs",
    template: "%s | Exploro",
  },
  description: "Exploro is an AI-powered business platform that helps small and medium businesses manage documents, customer relationships, communications, and workflows — all in one secure workspace.",
  keywords: [
    "AI business platform",
    "small business AI",
    "CRM with AI",
    "document management",
    "business automation",
    "AI workspace",
    "SMB software",
    "private AI assistant",
  ],
  authors: [{ name: "Exploro" }],
  creator: "Exploro",
  publisher: "Exploro",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
      "es": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_ES"],
    url: baseUrl,
    siteName: "Exploro",
    title: "Exploro — AI-Powered Business Platform for SMBs",
    description: "Manage documents, customer relationships, communications, and workflows with your own secure AI workspace.",
    images: [
      {
        url: "/assets/images/exploro-logo.png",
        width: 1200,
        height: 630,
        alt: "Exploro — AI-Powered Business Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exploro — AI-Powered Business Platform for SMBs",
    description: "Manage documents, customer relationships, communications, and workflows with your own secure AI workspace.",
    images: ["/assets/images/exploro-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/assets/images/exploro-icon.ico?v=2",
    shortcut: "/assets/images/exploro-icon.ico?v=2",
    apple: "/assets/images/exploro-icon.ico?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Exploro",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "AI-powered business platform for small and medium businesses — document management, CRM, email, calendar, and team workflows in one secure workspace.",
    url: baseUrl,
    offers: {
      "@type": "Offer",
      price: "30.00",
      priceCurrency: "USD",
      description: "Solo plan starts at $30/month. 15-day free trial available.",
    },
    publisher: {
      "@type": "Organization",
      name: "Exploro",
      url: baseUrl,
    },
  }

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Exploro OS",
    url: baseUrl,
    description: "AI-powered business platform for small and medium businesses.",
    logo: `${baseUrl}/assets/images/exploro-logo.png`,
    sameAs: [
      "https://www.linkedin.com/company/us-ai-bureau/",
      "https://www.facebook.com/profile.php?id=61591467366278",
    ],
  }

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Exploro OS",
    url: baseUrl,
    publisher: {
      "@type": "Organization",
      name: "Exploro OS",
      url: baseUrl,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What makes Exploro OS Private different from Public AI or other AI assistants?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Unlike generic or public GPTs, Exploro OS runs on an isolated, encrypted knowledge base that connects directly to channels like WhatsApp. Your data stays completely separate, temporary memory prevents leaks, and every answer is securely cited to eliminate or create minimum hallucinations.",
        },
      },
      {
        "@type": "Question",
        name: "How does temporary memory + persistent knowledge base work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Temporary memory: Deleted after you stop using your data. No contamination. Persistent knowledge base: Your long-term documents remain encrypted and accessible. You control what is kept.",
        },
      },
      {
        "@type": "Question",
        name: "How do I know the AI is not hallucinating?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every response cites your source. Every claim is verifiable. If the AI does not know, it will not invent. Your Agent will ask questions when it does not feel it would generate the right answer.",
        },
      },
      {
        "@type": "Question",
        name: "What communication channels does Exploro OS Private work with?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "WhatsApp, Telegram, email, and your website chatbot. Integrates directly. Transfers information constantly.",
        },
      },
      {
        "@type": "Question",
        name: "Is my data secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Short-term memory erases after use. Long-term knowledge base is encrypted. We integrate your Data Cloud into our system. We only extract documents when you explicitly ask to retrieve specific data. No automatic extraction. No silent access.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need technical skills to set this up?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. We do the integration. You provide the documents and brand voice. We handle the infrastructure.",
        },
      },
      {
        "@type": "Question",
        name: "What kind of businesses or professionals is this for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Any professional needing verifiable information, brand consistency, secure data handling, and multi-channel communication. Examples: consultants, legal, real estate, medical offices, customer support, coaches, educators.",
        },
      },
    ],
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://xkbqfzqrxfeuoadvwlyg.supabase.co" />
        <link rel="dns-prefetch" href="https://xkbqfzqrxfeuoadvwlyg.supabase.co" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
      </head>
      <body className={inter.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([softwareAppLd, orgLd, websiteLd, faqLd]) }} />
        <AuthProvider>
          <WorkspaceProvider>
            <I18nProvider>
              <Navbar />
              <main className="pt-[72px] min-h-screen">{children}</main>
              <Footer />
            </I18nProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
