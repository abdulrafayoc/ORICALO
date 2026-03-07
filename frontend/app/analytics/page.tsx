"use client";

import { useState } from "react";
import { BarChart3, ShieldCheck, Users, Clock, AlertCircle, Terminal } from "lucide-react";

export default function AnalyticsDashboard() {
    // In a real app, this would be fetched from the backend Database.
    // We are mocking a sample recent call to demonstrate the PII redaction and summarization.
    const [mockCall] = useState({
        id: "CALL-9021",
        date: new Date().toLocaleString(),
        status: "Qualified Lead",
        summary: "User is looking for a 10 Marla house in DHA Phase 5 Lahore. Budget is around 5 Crore.",
        transcript: [
            { role: "user", text: "Haan mujhe DHA phase 5 mein ghar dekhna hai. Mera number [REDACTED_PHONE] hai." },
            { role: "agent", text: "Zaroor, DHA Phase 5 mein 10 Marla ke ghar dastiyaab hain. Aapka budget kitna hai?" },
            { role: "user", text: "Mera budget 5 crore tak hai. Mera CNIC note kar lein: [REDACTED_CNIC]." },
            { role: "agent", text: "Shukriya. Main aapki maloomat note kar li hain. Humari team jald raabta karegi." }
        ]
    });

    return (
        <div className="h-full flex flex-col gap-8 p-2">
            <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-indigo-400" />
                        Post-Call Analytics
                    </h1>
                    <p className="text-sm text-neutral-400 mt-1">
                        Review call summaries, KPIs, and PII-redacted safe transcripts.
                    </p>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Calls</span>
                    </div>
                    <div className="text-3xl font-light text-white">124</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">PII Redacted</span>
                    </div>
                    <div className="text-3xl font-light text-white">100%</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <AlertCircle className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80">Qualified Leads</span>
                    </div>
                    <div className="text-3xl font-light text-white">42</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
                    </div>
                    <div className="text-3xl font-light text-white">1m 45s</div>
                </div>
            </div>

            {/* Recent Call Detail (Mocked) */}
            <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">

                {/* Meta & Summary */}
                <div className="w-full md:w-1/3 bg-neutral-900/50 p-6 border-r border-neutral-800">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-xs font-mono text-neutral-500">{mockCall.id}</div>
                            <div className="text-sm text-neutral-400 mt-1">{mockCall.date}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                            {mockCall.status}
                        </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-2">AI Summary</h3>
                    <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                        {mockCall.summary}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900 p-3 rounded border border-neutral-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        PII Automatically Redacted (CNIC, Phone)
                    </div>
                </div>

                {/* Transcript */}
                <div className="flex-1 p-6">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-neutral-400" />
                        Redacted Transcript
                    </h3>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">
                        {mockCall.transcript.map((turn, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                                    {turn.role}
                                </span>
                                <div className={`text-sm leading-relaxed font-urdu rounded px-4 py-3 ${turn.role === 'user'
                                    ? 'bg-neutral-900 text-blue-300 border border-neutral-800'
                                    : 'bg-indigo-950/30 text-emerald-300 border border-indigo-900/30'
                                    }`}>
                                    {/* Highlight Redactions */}
                                    {turn.text.split(/(\[REDACTED_PHONE\]|\[REDACTED_CNIC\])/g).map((part, j) => {
                                        if (part === '[REDACTED_PHONE]' || part === '[REDACTED_CNIC]') {
                                            return <span key={j} className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-xs mx-1 border border-red-500/30">{part}</span>
                                        }
                                        return <span key={j}>{part}</span>
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
