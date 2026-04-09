"use client";

import { useEffect, useState } from "react";
import { Kanban } from "lucide-react";
import { apiFetch } from "@/lib/api";

const STAGES = ["new", "contacted", "qualified", "viewing", "closed_won", "closed_lost"];

export default function CRMPipeline() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/crm/contacts")
            .then(res => res.json())
            .then(data => {
                setLeads(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Group leads by stage
    const pipelineData = STAGES.reduce((acc, stage) => {
        acc[stage] = leads.filter(l => l.stage === stage);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="space-y-6 overflow-x-hidden min-h-[80vh]">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                    <Kanban className="w-8 h-8 text-neutral-400" />
                    Deal Pipeline
                </h1>
            </div>

            {loading ? (
                <div className="p-8 text-neutral-400">Loading pipeline...</div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {STAGES.map(stage => (
                        <div key={stage} className="flex-shrink-0 w-80 bg-neutral-900/40 rounded-xl border border-neutral-800 flex flex-col max-h-[70vh]">
                            <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 rounded-t-xl flex justify-between items-center">
                                <h3 className="font-bold text-neutral-300 capitalize flex items-center gap-2">
                                    {stage.replace('_', ' ')}
                                    <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded-full">{pipelineData[stage].length}</span>
                                </h3>
                            </div>
                            
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {pipelineData[stage].map(lead => (
                                    <div key={lead.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-lg cursor-pointer hover:border-neutral-600 transition-colors">
                                        <div className="text-sm font-bold text-white mb-1">{lead.name || "Unknown Caller"}</div>
                                        <div className="text-xs text-neutral-500 font-mono mb-3">{lead.phone}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">Score: {lead.lead_score}</span>
                                            {lead.lead_score >= 80 && <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Hot</span>}
                                        </div>
                                    </div>
                                ))}
                                {pipelineData[stage].length === 0 && (
                                    <div className="text-center p-4 text-xs text-neutral-600 border border-dashed border-neutral-800 rounded-lg">
                                        No leads
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
