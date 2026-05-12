import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { CookieBanner } from "@/components/CookieBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORICALO — Urdu AI Real Estate Agent",
  description: "ORICALO handles inbound property calls in fluent Urdu.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${inter.variable} antialiased bg-[#030712] text-white min-h-screen`}>
      {children}
      <CookieBanner />
    </div>
  );
}
