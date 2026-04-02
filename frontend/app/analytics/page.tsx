"use client";

import { useState, useEffect } from "react";
import { BarChart3, ShieldCheck, Users, Clock, AlertCircle, Terminal, MapPin, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AnalyticsDashboard, RecentConversation } from "@/lib/types";

function formatDuration(seconds: number | null): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
}

export default function AnalyticsDashboardPage() {
    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCall, setSelectedCall] = useState<RecentConversation | null>(null);
    const [callTranscript, setCallTranscript] = useState<{ turn_index: number; role: string; text_redacted: string }[]>([]);

    useEffect(() => {
        apiFetch("/analytics/dashboard")
            .then(res => res.json())
            .then(data => { setDashboard(data); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    const loadTranscript = async (conv: RecentConversation) => {
        setSelectedCall(conv);
        try {
            const res = await apiFetch(`/conversations/${conv.id}`);
            const data = await res.json();
            setCallTranscript(data.turns || []);
        } catch {
            setCallTranscript([]);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-400">
                <p>Failed to load analytics: {error || "No data"}</p>
            </div>
        );
    }

    const { kpis, popular_areas, recent_conversations } = dashboard;

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
                    <div className="text-3xl font-light text-white">{kpis.total_calls}</div>
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
                    <div className="text-3xl font-light text-white">{kpis.qualified_leads}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
                    </div>
                    <div className="text-3xl font-light text-white">{formatDuration(Math.round(kpis.avg_duration_seconds))}</div>
                </div>
            </div>

            {/* Popular Areas */}
            {popular_areas.length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        Popular Areas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {popular_areas.map((area, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 rounded-full bg-indigo-950/40 text-indigo-300 border border-indigo-900/30 text-xs font-medium"
                            >
                                {area.location} ({area.mention_count})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Conversations + Detail */}
            <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[400px]">

                {/* Conversations List */}
                <div className="w-full md:w-1/3 bg-neutral-900/50 border-r border-neutral-800 overflow-y-auto max-h-[500px]">
                    <div className="p-4 border-b border-neutral-800">
                        <h3 className="text-sm font-semibold text-white">Recent Conversations</h3>
                        <p className="text-xs text-neutral-500 mt-1">{kpis.total_callers} unique callers</p>
                    </div>
                    {recent_conversations.length === 0 ? (
                        <div className="p-6 text-center text-neutral-500 text-sm">
                            No conversations yet. Start a voice session to see data here.
                        </div>
                    ) : (
                        recent_conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => loadTranscript(conv)}
                                className={`w-full text-left p-4 border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors ${
                                    selectedCall?.id === conv.id ? "bg-neutral-800/70" : ""
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-mono text-neutral-500">
                                        {conv.caller_phone || "Anonymous"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        conv.lead_status === "Qualified Lead"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                    }`}>
                                        {conv.lead_status}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                                    {conv.summary || "No summary available"}
                                </p>
                                <div className="flex gap-3 mt-2 text-xs text-neutral-600">
                                    <span>{formatDate(conv.started_at)}</span>
                                    <span>{formatDuration(conv.duration_seconds)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Transcript Detail */}
                <div className="flex-1 p-6">
                    {selectedCall ? (
                        <>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-neutral-400" />
                                        Redacted Transcript
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Session: {selectedCall.session_id.slice(0, 8)}...
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded border border-neutral-800">
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                    PII Redacted
                                </div>
                            </div>

                            {selectedCall.summary && (
                                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 mb-4">
                                    <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-1">AI Summary</h4>
                                    <p className="text-sm text-neutral-300 leading-relaxed">{selectedCall.summary}</p>
                                </div>
                            )}

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                                {callTranscript.map((turn, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                                            {turn.role}
                                        </span>
                                        <div className={`text-sm leading-relaxed font-urdu rounded px-4 py-3 ${
                                            turn.role === "user"
                                                ? "bg-neutral-900 text-blue-300 border border-neutral-800"
                                                : "bg-indigo-950/30 text-emerald-300 border border-indigo-900/30"
                                        }`}>
                                            {(turn.text_redacted || "").split(/(\[REDACTED_PHONE\]|\[REDACTED_CNIC\])/g).map((part, j) => {
                                                if (part === "[REDACTED_PHONE]" || part === "[REDACTED_CNIC]") {
                                                    return (
                                                        <span key={j} className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-xs mx-1 border border-red-500/30">
                                                            {part}
                                                        </span>
                                                    );
                                                }
                                                return <span key={j}>{part}</span>;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                            Select a conversation to view its transcript.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
