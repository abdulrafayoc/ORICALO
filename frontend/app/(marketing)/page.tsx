'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Mic2, 
  ArrowRight, 
  PhoneIncoming, 
  SmilePlus, 
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
  Building2,
  Zap,
  Clock,
  Star,
  Play,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic2 className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ORICALO</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-400 hover:text-white transition-colors">Log In</Link>
            <Link href="/login" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/20">
              Start Free Demo
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
            <div className="px-4 py-6 space-y-4">
              <Link href="#features" className="block text-slate-400 hover:text-white transition-colors py-2">Features</Link>
              <Link href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors py-2">How It Works</Link>
              <Link href="#pricing" className="block text-slate-400 hover:text-white transition-colors py-2">Pricing</Link>
              <Link href="#faq" className="block text-slate-400 hover:text-white transition-colors py-2">FAQ</Link>
              <Link href="/login" className="block text-slate-400 hover:text-white transition-colors py-2">Log In</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        
        <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Gen Voice Intelligence
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-white">
              The AI That Speaks <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Real Estate</span> — In Urdu
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
              ORICALO handles inbound property calls in fluent Urdu — qualifying leads, answering questions, and booking follow-ups while your agents sleep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                Start Free Demo <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 rounded-xl font-bold transition-all text-white flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Watch Video
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto relative">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-8 relative z-10 shadow-2xl shadow-indigo-500/10">
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <PhoneIncoming className="text-indigo-400 w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Live Inbound Call</div>
                    <div className="font-semibold text-lg text-white">+92 300 8472910 — DHA Phase 6</div>
                  </div>
                </div>
                <div className="flex gap-1 items-end h-8">
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="text-indigo-400 font-bold text-sm shrink-0 mt-1">AI Agent:</div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-none px-5 py-3 text-slate-200 leading-relaxed font-urdu text-xl text-right w-full">
                    السلام علیکم، اوریکلو میں خوش آمدید۔ میں آپ کی کیسے مدد کر سکتا ہوں؟ کیا آپ ڈی ایچ اے فیز 6 میں کسی خاص پلاٹ کے بارے میں جاننا چاہتے ہیں؟
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="text-slate-500 font-bold text-sm shrink-0 mt-1">Caller:</div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl rounded-tr-none px-5 py-3 text-slate-300 leading-relaxed font-urdu text-xl text-right w-full">
                    جی، میں ایک کنال کے ریٹ معلوم کرنا چاہ رہا ہوں۔ کیا آپ کے پاس بلاک ایل میں کوئی فائل دستیاب ہے؟
                  </div>
                </div>
              </div>
              
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800 pt-8">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Sentiment</div>
                  <div className="text-emerald-400 font-semibold flex items-center gap-2">
                    <SmilePlus className="w-4 h-4" /> Positive
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest text-left">Dialect</div>
                  <div className="font-semibold text-white text-left">Standard Urdu</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest text-left">Latency</div>
                  <div className="font-semibold text-white text-left">482ms</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest text-left">Intent</div>
                  <div className="text-blue-400 font-semibold text-left">Pricing Inquiry</div>
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 blur-[120px] -z-10"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-bold text-white">&lt; 800ms</div>
              <div className="text-slate-500 uppercase text-xs tracking-[0.2em] font-bold">End-to-End Latency</div>
            </div>
            <div className="space-y-2 md:border-x md:border-slate-800">
              <div className="text-4xl md:text-5xl font-bold text-white">98%</div>
              <div className="text-slate-500 uppercase text-xs tracking-[0.2em] font-bold">Urdu Speech Accuracy</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-bold text-white">24/7</div>
              <div className="text-slate-500 uppercase text-xs tracking-[0.2em] font-bold">Automated Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">Built for the Pakistan <br />Real Estate Market</h2>
            <p className="text-slate-400 max-w-xl">We've combined localized large language models with real-time property data to create the world's first AI that understands the nuances of local markets.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl group hover:border-indigo-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Languages className="text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Urdu Voice Intelligence</h3>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">Naturally handles local dialects from Karachi to Peshawar. Our AI isn't just translating; it's thinking and responding natively in Urdu, ensuring your clients feel understood and valued.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="text-sm font-medium text-indigo-400/80">✓ Regional Accents</div>
                <div className="text-sm font-medium text-indigo-400/80">✓ Slang Recognition</div>
                <div className="text-sm font-medium text-indigo-400/80">✓ Nuanced Response</div>
              </div>
            </div>
            
            <div className="md:col-span-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl group hover:border-indigo-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Instant AVM Pricing</h3>
              <p className="text-slate-400 leading-relaxed">AI predicts property values in real-time during the call based on historical data and current listings.</p>
            </div>

            <div className="md:col-span-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl group hover:border-indigo-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">PII Redaction</h3>
              <p className="text-slate-400 leading-relaxed">Automatically masks CNICs and Phone numbers for privacy before syncing to logs.</p>
            </div>

            <div className="md:col-span-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl group hover:border-indigo-500/30 transition-all overflow-hidden relative text-left">
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Database className="text-indigo-400 w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">RAG Knowledge Base</h3>
                  <p className="text-slate-400 leading-relaxed">Connect ORICALO to your actual property portfolio. The AI pulls real-time availability, square footage, and block details directly from your inventory database to give accurate answers.</p>
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                      <span>Syncing Database</span>
                      <span className="text-indigo-400">Active</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-indigo-500"></div>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="p-2 bg-slate-800/50 rounded text-slate-300">Emaar Canyon Views • Updated</div>
                      <div className="p-2 bg-slate-800/50 rounded text-slate-300">DHA Phase 8 Files • Updated</div>
                      <div className="p-2 bg-slate-800/50 rounded text-slate-300">Bahria Town Karachi 2 • Syncing...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 text-center">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6 text-white">Seamless Automation</h2>
            <p className="text-slate-400 text-lg">From the moment a lead dials your number, ORICALO manages the entire qualification lifecycle without human intervention.</p>
          </div>
          
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent -translate-y-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20 relative z-10">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
                  <PhoneIncoming className="text-indigo-400 w-8 h-8" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full text-white flex items-center justify-center font-bold text-sm">1</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">Call Received</h4>
                <p className="text-slate-400">Incoming call triggers the ORICALO engine via our secure integration.</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 relative shadow-lg shadow-indigo-500/20">
                  <BrainCircuit className="text-white w-12 h-12" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full text-slate-900 flex items-center justify-center font-bold text-sm">2</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">AI Conversation</h4>
                <p className="text-slate-400">Our LLM engages in natural Urdu, qualifying the lead's budget, area preference, and timeline.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
                  <UserCheck className="text-indigo-400 w-8 h-8" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full text-white flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">Lead Qualified</h4>
                <p className="text-slate-400">The verified lead and transcript are instantly pushed to your CRM for closing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Plans for every Agency</h2>
            <p className="text-slate-400">Scale your response time, not your payroll.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl flex flex-col hover:border-slate-700 transition-all text-left">
              <h3 className="text-xl font-bold mb-2 text-white">Starter</h3>
              <p className="text-slate-400 mb-8 text-sm">Perfect for individual brokers.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> 2 Active Agents</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> 500 Call Minutes/mo</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> Basic Urdu Support</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> Email Support</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl font-bold transition-all text-center text-white">Choose Starter</Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-900/50 backdrop-blur-xl border-2 border-indigo-500 p-8 lg:p-10 rounded-2xl flex flex-col relative md:scale-105 shadow-2xl shadow-indigo-500/10 text-left">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 text-white">Pro</h3>
              <p className="text-slate-400 mb-8 text-sm">Best for growing agencies.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-slate-200 font-medium"><Check className="w-4 h-4 text-indigo-400" /> 10 Active Agents</li>
                <li className="flex items-center gap-3 text-sm text-slate-200 font-medium"><Check className="w-4 h-4 text-indigo-400" /> Unlimited Call Minutes</li>
                <li className="flex items-center gap-3 text-sm text-slate-200 font-medium"><Check className="w-4 h-4 text-indigo-400" /> Advanced Dialects</li>
                <li className="flex items-center gap-3 text-sm text-slate-200 font-medium"><Check className="w-4 h-4 text-indigo-400" /> CRM Direct Sync</li>
                <li className="flex items-center gap-3 text-sm text-slate-200 font-medium"><Check className="w-4 h-4 text-indigo-400" /> Priority AI Queuing</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all text-center shadow-lg shadow-indigo-500/20">Choose Pro</Link>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 lg:p-10 rounded-2xl flex flex-col hover:border-slate-700 transition-all text-left">
              <h3 className="text-xl font-bold mb-2 text-white">Enterprise</h3>
              <p className="text-slate-400 mb-8 text-sm">For national real estate firms.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> Custom Agent Count</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> Full RAG Database Integration</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> Dedicated Success Manager</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-4 h-4 text-indigo-400" /> White-label Console</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl font-bold transition-all text-center text-white">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 lg:py-32 bg-slate-900/30">
        <div className="max-w-3xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-16 text-center text-white">Questions? Answers.</h2>
          <div className="space-y-4">
            {[ 
              { 
                q: "How accurate is the Urdu transcription?", 
                a: "Our models are trained on over 50,000 hours of local real estate calls. We achieve a 98% accuracy rate on standard Urdu and have high resiliency for regional accents from Punjab and Sindh." 
              },
              { 
                q: "Does it integrate with my existing CRM?", 
                a: "Yes. ORICALO natively integrates with Zameen, HubSpot, and standard SQL databases via our API. Leads are pushed instantly with full transcriptions." 
              },
              { 
                q: "What about data security?", 
                a: "All call recordings and transcripts are encrypted at rest and in transit. Our PII redaction engine ensures sensitive data like CNICs never reach your logs unless explicitly requested." 
              }
            ].map((item, i) => (
              <details key={i} className="group bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer text-left hover:border-slate-700 transition-all">
                <summary className="flex items-center justify-between font-bold text-white">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-indigo-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] -z-10"></div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to transform your real estate business?</h2>
            <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">Join hundreds of agencies already using ORICALO to qualify leads 24/7 in fluent Urdu.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                Start Free Demo <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl font-bold transition-all text-white">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Mic2 className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">ORICALO</span>
              </div>
              <p className="text-slate-400 max-w-sm mb-8">The world's first AI voice engine built specifically for the Pakistani real estate landscape. Native language, local data, extreme speed.</p>
              <div className="flex gap-4">
                <Link href="#" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-slate-400"><Twitter className="w-4 h-4" /></Link>
                <Link href="#" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-slate-400"><Linkedin className="w-4 h-4" /></Link>
              </div>
            </div>
            <div>
              <h5 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Product</h5>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Voice AI</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Lead Scoring</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Company</h5>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/marketing/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/marketing/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-800 text-xs text-slate-500 font-medium">
            <p>© 2025 ORICALO AI. Developed for the Future of Real Estate.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <span>Server Status: <span className="text-emerald-400">All Systems Nominal</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
