import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "./providers";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rapid Ledger",
  description: "Decision governance powered by RAPID",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <NavBar />
          {children}
        </Providers>
        <Toaster />
            <Analytics />
        {process.env.NEXT_PUBLIC_FATHOM_SITE_ID && (
          <Script src="https://cdn.usefathom.com/script.js"
            data-site={process.env.NEXT_PUBLIC_FATHOM_SITE_ID}
            strategy="afterInteractive" />
        )}
        {process.env.NEXT_PUBLIC_FATHOM_SITE_ID && (
          <Script src="https://cdn.usefathom.com/script.js"
            data-site={process.env.NEXT_PUBLIC_FATHOM_SITE_ID}
            strategy="afterInteractive" />
        )}
    </body>
    </html>
  );
}
