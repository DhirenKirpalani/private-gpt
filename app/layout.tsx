import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Exploro",
  description: "Your AI-powered business platform",
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
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>
          <Navbar />
          <main className="pt-[72px] min-h-screen">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
