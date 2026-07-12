import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "B20 Studio - Base Token Creator & Manager",
    template: "%s | B20 Studio"
  },
  description: "Create and manage native B20 tokens on Base. Launch Meme Coins, Stablecoins, and Security Tokens with built-in role management and compliance gating.",
  keywords: ["Base", "B20", "ERC-20", "Token Creator", "Stablecoin", "Security Token", "Meme Coin", "Coinbase", "L2", "Ethereum"],
  authors: [{ name: "Base Ecosystem" }],
  openGraph: {
    title: "B20 Studio - Base Token Creator & Manager",
    description: "Launch native B20 tokens on Base with built-in compliance, pausing, and role controls.",
    url: "https://b20.studio",
    siteName: "B20 Studio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "B20 Studio - Base Token Creator",
    description: "Create Meme Coins, Stablecoins, and Security Tokens natively on Base.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    "base:app_id": "6a532e34d3aa253766470619",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-full flex flex-col antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
