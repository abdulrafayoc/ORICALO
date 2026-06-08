import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using the ORICALO platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.",
  },
  {
    title: "2. Description of Service",
    body: "ORICALO provides an AI-powered voice platform for real estate lead qualification and customer service. We reserve the right to modify or discontinue any part of the service at any time.",
  },
  {
    title: "3. User Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the service in compliance with all applicable laws and regulations in Pakistan.",
  },
  {
    title: "4. Intellectual Property",
    body: "The service, including its original content, features, and functionality, is and will remain the exclusive property of ORICALO and its licensors.",
  },
  {
    title: "5. Limitation of Liability",
    body: "ORICALO shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.",
  },
];

export default function TermsPage() {
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
        Terms of Service
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
            Questions? <span className="text-foreground">legal@oricalo.com</span>
          </p>
        </section>
      </div>
    </div>
  );
}
