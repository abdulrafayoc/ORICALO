'use client';

import React from 'react';
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
  Linkedin
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="selection:bg-emerald-500/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-sash flex items-center justify-center">
              <Mic2 className="text-dark w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ORICALO</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-white/60">
            <Link href="#" className="hover:text-emerald-500 transition-colors">Product</Link>
            <Link href="#" className="hover:text-emerald-500 transition-colors">Integrations</Link>
            <Link href="#" className="hover:text-emerald-500 transition-colors">Pricing</Link>
            <Link href="#" className="hover:text-emerald-500 transition-colors">Resources</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors">Log In</Link>
            <Link href="/login" className="bg-emerald-500 hover:bg-emerald-600 text-dark px-5 py-2.5 rounded-sash text-sm font-bold transition-all transform hover:scale-[1.02]">Start Free Demo</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold tracking-widest uppercase mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Next-Gen Voice Intelligence
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9] text-white">
            The AI That Speaks Real Estate — <span className="text-emerald-500">In Urdu</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-white/60 leading-relaxed mb-10">
            ORICALO handles inbound property calls in fluent Urdu — qualifying leads, answering questions, and booking follow-ups while your agents sleep.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="px-8 py-4 bg-emerald-500 text-dark font-bold rounded-sash hover:bg-emerald-600 transition-all flex items-center gap-2">
              Start Free Demo <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-sash font-bold transition-all text-white">
              Watch Video
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="glass rounded-2xl p-4 md:p-8 emerald-glow relative z-10">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <PhoneIncoming className="text-emerald-500 w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-white/40 font-medium uppercase tracking-wider">Live Inbound Call</div>
                  <div className="font-semibold text-lg text-white">+92 300 8472910 — DHA Phase 6</div>
                </div>
              </div>
              <div className="flex gap-1 items-end h-8">
                <div className="wave-bar w-1.5 bg-emerald-500 rounded-full"></div>
                <div className="wave-bar w-1.5 bg-emerald-400 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                <div className="wave-bar w-1.5 bg-emerald-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                <div className="wave-bar w-1.5 bg-emerald-600 rounded-full" style={{ animationDelay: '0.3s' }}></div>
                <div className="wave-bar w-1.5 bg-emerald-400 rounded-full" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="text-emerald-500 font-bold text-sm shrink-0 mt-1">AI Agent:</div>
                <div className="bg-emerald-500/10 rounded-2xl rounded-tl-none px-5 py-3 text-white/90 leading-relaxed font-urdu text-xl text-right w-full">
                  السلام علیکم، اوریکلو میں خوش آمدید۔ میں آپ کی کیسے مدد کر سکتا ہوں؟ کیا آپ ڈی ایچ اے فیز 6 میں کسی خاص پلاٹ کے بارے میں جاننا چاہتے ہیں؟
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-white/40 font-bold text-sm shrink-0 mt-1">Caller:</div>
                <div className="bg-white/5 rounded-2xl rounded-tr-none px-5 py-3 text-white/70 leading-relaxed font-urdu text-xl text-right w-full">
                  جی، میں ایک کنال کے ریٹ معلوم کرنا چاہ رہا ہوں۔ کیا آپ کے پاس بلاک ایل میں کوئی فائل دستیاب ہے؟
                </div>
              </div>
            </div>
            
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-8">
              <div>
                <div className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-widest">Sentiment</div>
                <div className="text-emerald-500 font-semibold flex items-center gap-2">
                  <SmilePlus className="w-4 h-4" /> Positive
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-widest text-left">Dialect</div>
                <div className="font-semibold text-white text-left">Standard Urdu</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-widest text-left">Latency</div>
                <div className="font-semibold text-white text-left">482ms</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase font-bold mb-1 tracking-widest text-left">Intent</div>
                <div className="text-blue-400 font-semibold text-left">Pricing Inquiry</div>
              </div>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/5 blur-[120px] -z-10"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">&lt; 800ms</div>
              <div className="text-white/40 uppercase text-xs tracking-[0.2em] font-bold">End-to-End Latency</div>
            </div>
            <div className="space-y-2 md:border-x border-white/5">
              <div className="text-4xl font-bold text-white">98%</div>
              <div className="text-white/40 uppercase text-xs tracking-[0.2em] font-bold">Urdu Speech Accuracy</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">24/7</div>
              <div className="text-white/40 uppercase text-xs tracking-[0.2em] font-bold">Automated Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">Built for the Pakistan <br />Real Estate Market</h2>
            <p className="text-white/40 max-w-xl">We've combined localized large language models with real-time property data to create the world's first AI that understands the nuances of local markets.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 glass p-10 rounded-3xl group hover:border-emerald-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Languages className="text-emerald-500 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Urdu Voice Intelligence</h3>
              <p className="text-white/50 text-lg leading-relaxed mb-8">Naturally handles local dialects from Karachi to Peshawar. Our AI isn't just translating; it's thinking and responding natively in Urdu, ensuring your clients feel understood and valued.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="text-sm font-medium text-emerald-500/80">✓ Regional Accents</div>
                <div className="text-sm font-medium text-emerald-500/80">✓ Slang Recognition</div>
                <div className="text-sm font-medium text-emerald-500/80">✓ Nuanced Response</div>
              </div>
            </div>
            
            <div className="md:col-span-4 glass p-10 rounded-3xl group hover:border-emerald-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-emerald-500 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Instant AVM Pricing</h3>
              <p className="text-white/50 leading-relaxed">AI predicts property values in real-time during the call based on historical data and current listings.</p>
            </div>

            <div className="md:col-span-4 glass p-10 rounded-3xl group hover:border-emerald-500/30 transition-all text-left">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="text-emerald-500 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">PII Redaction</h3>
              <p className="text-white/50 leading-relaxed">Automatically masks CNICs and Phone numbers for privacy before syncing to logs.</p>
            </div>

            <div className="md:col-span-8 glass p-10 rounded-3xl group hover:border-emerald-500/30 transition-all overflow-hidden relative text-left">
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <Database className="text-emerald-500 w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">RAG Knowledge Base</h3>
                  <p className="text-white/50 leading-relaxed">Connect ORICALO to your actual property portfolio. The AI pulls real-time availability, square footage, and block details directly from your inventory database to give accurate answers.</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-white/40 font-bold uppercase">
                      <span>Syncing Database</span>
                      <span className="text-emerald-500">Active</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-emerald-500"></div>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="p-2 bg-white/5 rounded text-white/70">Emaar Canyon Views • Updated</div>
                      <div className="p-2 bg-white/5 rounded text-white/70">DHA Phase 8 Files • Updated</div>
                      <div className="p-2 bg-white/5 rounded text-white/70">Bahria Town Karachi 2 • Syncing...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automation Section */}
      <section className="py-32 bg-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-center max-w-2xl mx-auto mb-24">
            <h2 className="text-4xl font-bold mb-6 text-white">Seamless Automation</h2>
            <p className="text-white/40 text-lg">From the moment a lead dials your number, ORICALO manages the entire qualification lifecycle without human intervention.</p>
          </div>
          
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-20 relative z-10">
              <div className="text-center">
                <div className="w-20 h-20 bg-dark border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                  <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.057 15.143c0-.131-.059-.25-.157-.333l-2.029-1.742c-.104-.084-.234-.131-.371-.131-.141 0-.274.053-.383.149l-1.464 1.258c-1.397-.738-2.541-1.882-3.279-3.279l1.258-1.464c.096-.109.149-.242.149-.383 0-.137-.047-.267-.131-.371l-1.742-2.029a.465.465 0 00-.333-.157c-.141 0-.267.054-.374.157L8.29 8.351c-.131.131-.194.293-.194.467 0 .15.045.303.136.467 1.353 2.454 3.39 4.491 5.844 5.844.164.091.317.136.467.136.174 0 .336-.063.467-.194l1.531-1.531c.103-.107.157-.233.157-.374zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/>
                  </svg>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full text-dark flex items-center justify-center font-bold text-sm">1</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">Call Received</h4>
                <p className="text-white/50">Incoming call triggers the ORICALO engine via our secure Twilio integration.</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 relative emerald-glow">
                  <BrainCircuit className="text-dark w-12 h-12" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full text-dark flex items-center justify-center font-bold text-sm">2</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">AI Conversation</h4>
                <p className="text-white/50">Our LLM engages in natural Urdu, qualifying the lead's budget, area preference, and timeline.</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-dark border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                  <UserCheck className="text-emerald-500 w-8 h-8" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full text-dark flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <h4 className="text-xl font-bold mb-4 text-white">Lead Qualified</h4>
                <p className="text-white/50">The verified lead and transcript are instantly pushed to your CRM for closing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Plans for every Agency</h2>
            <p className="text-white/40">Scale your response time, not your payroll.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="glass p-10 rounded-3xl flex flex-col border border-white/5 hover:border-white/20 transition-all text-left">
              <h3 className="text-xl font-bold mb-2 text-white">Starter</h3>
              <p className="text-white/40 mb-8 text-sm">Perfect for individual brokers.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> 2 Active Agents</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> 500 Call Minutes/mo</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> Basic Urdu Support</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> Email Support</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-white/5 border border-white/10 rounded-sash font-bold hover:bg-white/10 transition-all text-center text-white">Choose Starter</Link>
            </div>

            {/* Pro */}
            <div className="glass p-10 rounded-3xl flex flex-col border-2 border-emerald-500 relative md:scale-105 shadow-2xl shadow-emerald-500/10 text-left">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-dark text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 text-white">Pro</h3>
              <p className="text-white/40 mb-8 text-sm">Best for growing agencies.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-white/90 font-medium"><Check className="w-4 h-4 text-emerald-500" /> 10 Active Agents</li>
                <li className="flex items-center gap-3 text-sm text-white/90 font-medium"><Check className="w-4 h-4 text-emerald-500" /> Unlimited Call Minutes</li>
                <li className="flex items-center gap-3 text-sm text-white/90 font-medium"><Check className="w-4 h-4 text-emerald-500" /> Advanced Dialects</li>
                <li className="flex items-center gap-3 text-sm text-white/90 font-medium"><Check className="w-4 h-4 text-emerald-500" /> CRM Direct Sync</li>
                <li className="flex items-center gap-3 text-sm text-white/90 font-medium"><Check className="w-4 h-4 text-emerald-500" /> Priority AI Queuing</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-emerald-500 text-dark rounded-sash font-bold hover:bg-emerald-600 transition-all text-center">Choose Pro</Link>
            </div>

            {/* Enterprise */}
            <div className="glass p-10 rounded-3xl flex flex-col border border-white/5 hover:border-white/20 transition-all text-left">
              <h3 className="text-xl font-bold mb-2 text-white">Enterprise</h3>
              <p className="text-white/40 mb-8 text-sm">For national real estate firms.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> Custom Agent Count</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> Full RAG Database Integration</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> Dedicated Success Manager</li>
                <li className="flex items-center gap-3 text-sm text-white/70"><Check className="w-4 h-4 text-emerald-500" /> White-label Console</li>
              </ul>
              <Link href="/login" className="w-full py-4 bg-white/5 border border-white/10 rounded-sash font-bold hover:bg-white/10 transition-all text-center text-white">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-white/5">
        <div className="max-w-3xl mx-auto px-6">
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
              <details key={i} className="group glass rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer text-left">
                <summary className="flex items-center justify-between font-bold text-white">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-emerald-500 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-white/50 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-emerald-500 rounded-sash flex items-center justify-center">
                  <Mic2 className="text-dark w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">ORICALO</span>
              </div>
              <p className="text-white/40 max-w-sm mb-8">The world's first AI voice engine built specifically for the Pakistani real estate landscape. Native language, local data, extreme speed.</p>
              <div className="flex gap-4">
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-dark transition-all text-white"><Twitter className="w-4 h-4" /></Link>
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-dark transition-all text-white"><Linkedin className="w-4 h-4" /></Link>
              </div>
            </div>
            <div>
              <h5 className="font-bold mb-6 uppercase text-xs tracking-widest text-white/40">Product</h5>
              <ul className="space-y-4 text-sm text-white/60">
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Voice AI</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Lead Scoring</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Integrations</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 uppercase text-xs tracking-widest text-white/40">Company</h5>
              <ul className="space-y-4 text-sm text-white/60">
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-emerald-500 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/5 text-xs text-white/20 font-medium">
            <p>© 2024 ORICALO AI. Developed for the Future of Real Estate.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <span>Server Status: <span className="text-emerald-500">All Systems Nominal</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
