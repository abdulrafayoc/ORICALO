"use client";

import { useEffect, useState } from "react";
import { User, Phone } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CRMLeadDetail({ params }: { params: { id: string } }) {
    const [lead, setLead] = useState<any>(null);
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiFetch(`/crm/contacts/${params.id}`).then(res => res.json()),
            apiFetch(`/crm/contacts/${params.id}/calls`).then(res => res.json())
        ]).then(([leadData, callsData]) => {
            setLead(leadData);
            setCalls(callsData);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [params.id]);

    if (loading) return <div className="p-8 text-neutral-400">Loading lead profile...</div>;
    if (!lead) return <div className="p-8 text-red-400">Lead not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center border border-neutral-700">
                    <User className="w-8 h-8 text-neutral-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                        {lead.name || "Unknown Caller"}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-neutral-400">
                        <span className="flex items-center gap-1.5"><Phone className="w-4 h-4"/> {lead.phone}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300 capitalize">
                            {lead.stage.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl space-y-4">
                    <h3 className="text-xl font-bold text-white mb-2">Details</h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between text-neutral-400">
                            <span>Score</span>
                            <span className="text-white font-mono">{lead.lead_score}/100</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                            <span>Source</span>
                            <span className="text-white">{lead.source}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                            <span>Created At</span>
                            <span className="text-white">{new Date(lead.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-4">Call History ({calls.length})</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {calls.length === 0 ? (
                            <p className="text-neutral-500">No calls linked to this lead.</p>
                        ) : calls.map(call => (
                            <div key={call.id} className="p-4 border border-neutral-800 bg-black rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-neutral-500">{new Date(call.created_at).toLocaleString()}</span>
                                    <span className="text-xs font-mono bg-neutral-800 px-2 rounded">Score: {call.lead_score}</span>
                                </div>
                                <p className="text-sm text-neutral-300 mb-3">{call.summary || "No summary available"}</p>
                                
                                {call.qualification_data && Object.keys(call.qualification_data).length > 0 && (
                                    <div className="bg-neutral-900 rounded p-3 mt-2 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                        {Object.entries(call.qualification_data).map(([k, v]) => v && (
                                            <div key={k}>
                                                <span className="text-neutral-500 block mb-0.5 capitalize">{k.replace('_', ' ')}</span>
                                                <span className="text-neutral-200">{String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
