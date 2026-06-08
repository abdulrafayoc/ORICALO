"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  PhoneIncoming,
  Languages,
  TrendingUp,
  ShieldCheck,
  Database,
  BrainCircuit,
  UserCheck,
  Check,
  ChevronDown,
  Twitter,
  Linkedin,
  Play,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/ui/brand-mark";
import { StatusDot } from "@/components/ui/status-dot";
import { Ticker } from "@/components/Ticker";

const FAQ = [
  {
    q: "How accurate is the Urdu transcription?",
    a: "Our models are trained on over 50,000 hours of local real estate calls. We achieve a 98% accuracy rate on standard Urdu and have high resiliency for regional accents from Punjab and Sindh.",
  },
  {
    q: "Does it integrate with my existing CRM?",
    a: "Yes. ORICALO natively integrates with Zameen, HubSpot, and standard SQL databases via our API. Leads are pushed instantly with full transcriptions.",
  },
  {
    q: "What about data security?",
    a: "All call recordings and transcripts are encrypted at rest and in transit. Our PII redaction engine ensures sensitive data like CNICs never reach your logs unless explicitly requested.",
  },
];

const TIERS = [
  {
    name: "Starter",
    blurb: "Perfect for individual brokers.",
    items: [
      "2 active agents",
      "500 call minutes / mo",
      "Basic Urdu support",
      "Email support",
    ],
    cta: "Choose Starter",
    popular: false,
  },
  {
    name: "Pro",
    blurb: "Best for growing agencies.",
    items: [
      "10 active agents",
      "Unlimited call minutes",
      "Advanced dialects",
      "CRM direct sync",
      "Priority AI queuing",
    ],
    cta: "Choose Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    blurb: "For national real estate firms.",
    items: [
      "Custom agent count",
      "Full RAG database integration",
      "Dedicated success manager",
      "White-label console",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-accent/30 selection:text-foreground">
      {/* ─── Navigation ─────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
          scrolled
            ? "bg-card/85 border-b border-border backdrop-blur-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <BrandMark size={28} />
            <span className="font-serif text-lg text-foreground">Oricalo</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Start free demo</Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-sm"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border">
            <div className="px-5 py-5 space-y-3 font-mono text-[11px] uppercase tracking-[0.12em]">
              <Link href="#features" className="block text-muted-foreground hover:text-foreground py-2">
                Features
              </Link>
              <Link href="#how-it-works" className="block text-muted-foreground hover:text-foreground py-2">
                How it works
              </Link>
              <Link href="#pricing" className="block text-muted-foreground hover:text-foreground py-2">
                Pricing
              </Link>
              <Link href="#faq" className="block text-muted-foreground hover:text-foreground py-2">
                FAQ
              </Link>
              <Link href="/login" className="block text-muted-foreground hover:text-foreground py-2">
                Log in
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-gradient-to-b from-accent/8 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center mb-14">
            <Badge variant="mint" className="mb-7 inline-flex items-center gap-2 px-2.5 py-1">
              <StatusDot state="live" size="xs" />
              Next-gen voice intelligence
            </Badge>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight text-foreground mb-7">
              The AI that speaks
              <br />
              <span className="text-accent italic">real estate</span> — in Urdu
            </h1>

            <p className="max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed mb-9">
              ORICALO handles inbound property calls in fluent Urdu — qualifying
              leads, answering questions, and booking follow-ups while your
              agents sleep.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start free demo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                <Play className="w-4 h-4" />
                Watch video
              </Button>
            </div>
          </div>

          {/* ─── Mock call panel ─────────────────────────────────── */}
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardBody className="p-5 md:p-7">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center">
                      <PhoneIncoming className="text-accent w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        Live inbound call
                      </div>
                      <div className="font-mono text-sm text-foreground mt-0.5">
                        +92 300 8472910 · DHA Phase 6
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 items-end h-7">
                    {[1, 0.7, 1, 0.85, 0.6].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-accent rounded-full wave-bar"
                        style={{
                          height: `${h * 28}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex gap-3 items-start">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent shrink-0 mt-2 w-16">
                      Agent
                    </div>
                    <div className="bg-accent/5 border border-accent/20 rounded-md px-4 py-3 text-foreground leading-relaxed font-urdu text-lg text-right w-full">
                      السلام علیکم، اوریکلو میں خوش آمدید۔ میں آپ کی کیسے مدد کر
                      سکتا ہوں؟ کیا آپ ڈی ایچ اے فیز 6 میں کسی خاص پلاٹ کے بارے
                      میں جاننا چاہتے ہیں؟
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground shrink-0 mt-2 w-16">
                      Caller
                    </div>
                    <div className="bg-muted border border-border rounded-md px-4 py-3 text-muted-foreground leading-relaxed font-urdu text-lg text-right w-full">
                      جی، میں ایک کنال کے ریٹ معلوم کرنا چاہ رہا ہوں۔ کیا آپ کے
                      پاس بلاک ایل میں کوئی فائل دستیاب ہے؟
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-5 border-t border-border pt-6">
                  {[
                    { label: "Sentiment", value: "Positive", accent: true },
                    { label: "Dialect", value: "Standard Urdu" },
                    { label: "Latency", value: "482ms", mono: true },
                    { label: "Intent", value: "Pricing inquiry", accent: true },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                        {m.label}
                      </div>
                      <div
                        className={
                          (m.accent ? "text-accent " : "text-foreground ") +
                          (m.mono ? "font-mono text-sm" : "font-serif text-base")
                        }
                      >
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────── */}
      <section className="border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="font-serif text-5xl text-foreground">
                &lt; <Ticker value={800} format="number" />
                <span className="text-2xl text-muted-foreground ml-1">ms</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                End-to-end latency
              </div>
            </div>
            <div className="space-y-2 md:border-x md:border-border">
              <div className="font-serif text-5xl text-foreground">
                <Ticker value={98} format="number" />%
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Urdu speech accuracy
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-serif text-5xl text-foreground">24/7</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Automated response
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5 leading-tight">
              Built for the Pakistan
              <br />
              real estate market
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Localized large language models fused with real-time property data
              — the first AI that understands the nuances of local markets,
              dialects, and price conventions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Large: Urdu Voice */}
            <div className="md:col-span-8">
              <Card live>
                <CardBody className="p-7 lg:p-9">
                  <div className="w-12 h-12 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
                    <Languages className="text-accent w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-3">
                    Urdu voice intelligence
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-7">
                    Naturally handles local dialects from Karachi to Peshawar.
                    The AI isn&apos;t translating — it&apos;s thinking and
                    responding natively in Urdu, so your clients feel understood
                    and valued.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["Regional accents", "Slang recognition", "Nuanced response"].map((f) => (
                      <div
                        key={f}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent flex items-center gap-2"
                      >
                        <Check className="w-3 h-3" /> {f}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* AVM */}
            <div className="md:col-span-4">
              <Card live>
                <CardBody className="p-7 lg:p-9">
                  <div className="w-12 h-12 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
                    <TrendingUp className="text-accent w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-3">
                    Instant AVM pricing
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Predicts property values in real-time during the call from
                    historical data and current listings.
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* PII */}
            <div className="md:col-span-4">
              <Card live>
                <CardBody className="p-7 lg:p-9">
                  <div className="w-12 h-12 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
                    <ShieldCheck className="text-accent w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-3">
                    PII redaction
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Automatically masks CNICs and phone numbers for privacy
                    before syncing to logs.
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* RAG */}
            <div className="md:col-span-8">
              <Card live>
                <CardBody className="p-7 lg:p-9">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <div className="w-12 h-12 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
                        <Database className="text-accent w-6 h-6" />
                      </div>
                      <h3 className="font-serif text-2xl text-foreground mb-3">
                        RAG knowledge base
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Connect ORICALO to your actual property portfolio. The
                        AI pulls real-time availability, square footage, and
                        block details directly from your inventory database to
                        give accurate answers.
                      </p>
                    </div>
                    <div className="flex-1 bg-muted rounded-md p-5 border border-border">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Syncing database
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent flex items-center gap-1">
                            <StatusDot state="live" size="xs" /> active
                          </span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="w-2/3 h-full bg-accent" />
                        </div>
                        <div className="space-y-2">
                          {[
                            { name: "Emaar Canyon Views", state: "updated" },
                            { name: "DHA Phase 8 Files", state: "updated" },
                            { name: "Bahria Town Karachi 2", state: "syncing…" },
                          ].map((row) => (
                            <div
                              key={row.name}
                              className="flex items-center justify-between px-3 py-2 bg-card rounded-sm border border-border"
                            >
                              <span className="text-sm text-foreground">{row.name}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                                {row.state}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-card/40">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-4xl text-foreground mb-4">
              Seamless automation
            </h2>
            <p className="text-muted-foreground">
              From the moment a lead dials your number, ORICALO manages the
              entire qualification lifecycle without human intervention.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-10 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 relative z-10">
              {[
                {
                  icon: PhoneIncoming,
                  title: "Call received",
                  body: "Incoming call triggers the ORICALO engine via our secure integration.",
                  n: "01",
                },
                {
                  icon: BrainCircuit,
                  title: "AI conversation",
                  body: "The LLM engages in natural Urdu, qualifying budget, area preference, and timeline.",
                  n: "02",
                  emphasized: true,
                },
                {
                  icon: UserCheck,
                  title: "Lead qualified",
                  body: "The verified lead and transcript are instantly pushed to your CRM for closing.",
                  n: "03",
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="text-center">
                    <div
                      className={`relative mx-auto mb-6 ${
                        s.emphasized
                          ? "w-20 h-20 bg-primary/15 border border-accent"
                          : "w-16 h-16 bg-card border border-border"
                      } rounded-sm flex items-center justify-center`}
                    >
                      <Icon
                        className={`${
                          s.emphasized ? "text-accent w-9 h-9" : "text-accent w-7 h-7"
                        }`}
                      />
                      <div className="absolute -top-2 -right-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground bg-background px-1.5 py-0.5 border border-border rounded-sm">
                        {s.n}
                      </div>
                    </div>
                    <h4 className="font-serif text-xl text-foreground mb-2">
                      {s.title}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                      {s.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
              Plans for every agency
            </h2>
            <p className="text-muted-foreground">
              Scale your response time, not your payroll.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative ${tier.popular ? "md:scale-[1.02]" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="mint" className="px-2.5 py-1">
                      Most popular
                    </Badge>
                  </div>
                )}
                <Card
                  className={
                    tier.popular ? "border-accent/50 ring-1 ring-accent/20" : ""
                  }
                >
                  <CardBody className="p-7 lg:p-8 flex flex-col h-full">
                    <h3 className="font-serif text-2xl text-foreground mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-7">{tier.blurb}</p>
                    <ul className="space-y-3 mb-8 flex-grow">
                      {tier.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-3 text-sm text-foreground"
                        >
                          <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup">
                      <Button
                        className="w-full"
                        variant={tier.popular ? "primary" : "outline"}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 lg:py-28 bg-card/40">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <h2 className="font-serif text-4xl text-center text-foreground mb-12">
            Questions? Answers.
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group bg-card border border-border rounded-md p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer hover:border-accent/30 transition-colors"
              >
                <summary className="flex items-center justify-between font-serif text-base text-foreground">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-accent group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <div className="bg-card border border-border rounded-md p-10 lg:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 blur-[100px] -z-10" />
            <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-5 leading-tight">
              Ready to transform your
              <br />
              real estate business?
            </h2>
            <p className="text-muted-foreground text-base mb-8 max-w-xl mx-auto">
              Join hundreds of agencies already using ORICALO to qualify leads
              24/7 in fluent Urdu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start free demo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline">
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="py-14 border-t border-border">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-5">
                <BrandMark size={28} />
                <span className="font-serif text-lg text-foreground">Oricalo</span>
              </Link>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
                The first AI voice engine built specifically for the Pakistani
                real estate landscape. Native language, local data, extreme
                speed.
              </p>
              <div className="flex gap-3">
                <Link
                  href="#"
                  aria-label="Twitter"
                  className="w-9 h-9 rounded-sm border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </Link>
                <Link
                  href="#"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-sm border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div>
              <h5 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-5">
                Product
              </h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#features" className="text-foreground hover:text-accent transition-colors">
                    Voice AI
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-foreground hover:text-accent transition-colors">
                    Lead scoring
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-foreground hover:text-accent transition-colors">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-foreground hover:text-accent transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-5">
                Company
              </h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#" className="text-foreground hover:text-accent transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-foreground hover:text-accent transition-colors">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-foreground hover:text-accent transition-colors">
                    Terms of service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-foreground hover:text-accent transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-7 border-t border-border gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              &copy; 2026 ORICALO AI · Karachi
            </p>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
              <StatusDot state="live" size="xs" />
              All systems nominal
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
