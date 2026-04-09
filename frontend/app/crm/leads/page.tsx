"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function CRMLeads() {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                    <Users className="w-8 h-8 text-neutral-400" />
                    Leads (Contacts)
                </h1>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/50 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-neutral-400">Loading leads...</div>
                ) : leads.length === 0 ? (
                    <div className="p-8 text-neutral-500 text-center">No leads found. Make some calls!</div>
                ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Name/Phone</th>
                                <th className="px-6 py-4 font-medium">Stage</th>
                                <th className="px-6 py-4 font-medium">Lead Score</th>
                                <th className="px-6 py-4 font-medium">Source</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {leads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-neutral-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-white font-medium">{lead.name || "Unknown Caller"}</div>
                                        <div className="text-neutral-500 font-mono text-xs mt-1">{lead.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300 capitalize">
                                            {lead.stage.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-white flex items-center gap-2">
                                            {lead.lead_score}
                                            {lead.lead_score >= 80 && (
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {lead.source}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/crm/leads/${lead.id}`} className="text-blue-500 hover:text-blue-400 font-medium">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
