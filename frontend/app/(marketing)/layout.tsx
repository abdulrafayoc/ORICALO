import type { Metadata } from "next";
import { CookieBanner } from "@/components/CookieBanner";

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
    <div className="bg-background text-foreground min-h-screen paper-noise">
      {children}
      <CookieBanner />
    </div>
  );
}
