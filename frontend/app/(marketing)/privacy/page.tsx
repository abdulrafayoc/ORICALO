import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly to us when you create an account, use our services, or communicate with us. This may include your name, email address, company information, and any voice data processed by our AI agents during sessions.",
  },
  {
    title: "2. How We Use Information",
    body: "We use the information we collect to provide, maintain, and improve our services, including to process voice-to-text, generate AI responses, and provide analytics. We also use information to communicate with you about updates and support.",
  },
  {
    title: "3. Data Security",
    body: "We implement reasonable security measures to protect your information. All transcripts are PII-redacted (e.g., phone numbers and CNICs) before storage. Data is encrypted both at rest and in transit using industry-standard protocols.",
  },
  {
    title: "4. Cookies and Tracking",
    body: "We use cookies to improve your browsing experience and analyze our website traffic. You can manage your cookie preferences through the banner on our website or your browser settings.",
  },
  {
    title: "5. Your Rights",
    body: "Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. Please contact us to exercise these rights.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-accent transition-colors mb-12"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back home
      </Link>

      <h1 className="font-serif text-4xl lg:text-5xl text-foreground mb-3">
        Privacy Policy
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-12">
        Last updated · May 2026
      </p>

      <div className="space-y-10 text-muted-foreground leading-relaxed">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif text-xl text-foreground mb-3">
              {s.title}
            </h2>
            <p>{s.body}</p>
          </section>
        ))}

        <section className="pt-8 border-t border-border">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em]">
            Questions?{" "}
            <span className="text-foreground">privacy@oricalo.com</span>
          </p>
        </section>
      </div>
    </div>
  );
}
