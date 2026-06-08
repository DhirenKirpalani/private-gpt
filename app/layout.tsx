import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Exploro",
  description: "Your AI-powered business platform",
  icons: {
    icon: [
      { url: "/assets/images/exploro-logo.png", sizes: "512x512", type: "image/png" },
      { url: "/assets/images/exploro-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/images/exploro-logo.png", sizes: "96x96",  type: "image/png" },
      { url: "/assets/images/exploro-logo.png", sizes: "32x32",  type: "image/png" },
      { url: "/assets/images/exploro-logo.png", sizes: "16x16",  type: "image/png" },
    ],
    shortcut: "/assets/images/exploro-logo.png",
    apple:    { url: "/assets/images/exploro-logo.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navbar />
        <main className="pt-[72px] min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
