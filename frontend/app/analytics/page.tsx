"use client";

import { useState, useEffect } from "react";
import { BarChart3, ShieldCheck, Users, Clock, AlertCircle, Terminal, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface KPIStats {
    total_calls: number;
    qualified_leads: number;
    pii_redacted_pct: number;
    avg_duration: string;
}

interface CallDetail {
    id: string;
    date: string;
    status: string;
    summary: string;
    transcript: { role: string; text: string }[];
}

export default function AnalyticsDashboard() {
    const [kpis, setKpis] = useState<KPIStats | null>(null);
    const [recentCalls, setRecentCalls] = useState<CallDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [kpiRes, callsRes] = await Promise.all([
                    apiFetch("/analytics/kpis"),
                    apiFetch("/analytics/recent-calls?limit=5")
                ]);

                if (kpiRes.ok) setKpis(await kpiRes.json());
                if (callsRes.ok) setRecentCalls(await callsRes.json());
            } catch (err) {
                console.error("Failed to fetch analytics data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const callToDisplay = recentCalls.length > 0 ? recentCalls[0] : null;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        );
    }

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
                    <div className="text-3xl font-light text-white">{kpis?.total_calls ?? 0}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">PII Redacted</span>
                    </div>
                    <div className="text-3xl font-light text-white">{kpis?.pii_redacted_pct ?? 100}%</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <AlertCircle className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80">Qualified Leads</span>
                    </div>
                    <div className="text-3xl font-light text-white">{kpis?.qualified_leads ?? 0}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
                    </div>
                    <div className="text-3xl font-light text-white">{kpis?.avg_duration ?? "0s"}</div>
                </div>
            </div>

            {/* Recent Call Detail */}
            {callToDisplay ? (
                <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                    {/* Meta & Summary */}
                    <div className="w-full md:w-1/3 bg-neutral-900/50 p-6 border-r border-neutral-800">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-xs font-mono text-neutral-500">{callToDisplay.id}</div>
                                <div className="text-sm text-neutral-400 mt-1">{callToDisplay.date}</div>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                {callToDisplay.status}
                            </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white mb-2">AI Summary</h3>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                            {callToDisplay.summary}
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
                            {(callToDisplay.transcript || []).map((turn, i) => (
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
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center text-neutral-500">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No call data available.</p>
                    <p className="text-xs mt-2 opacity-60">Complete a call in the console to generate analytics.</p>
                </div>
            )}
        </div>
    );
}
