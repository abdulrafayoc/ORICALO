"use client";

import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CRMCalls() {
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/crm/calls")
            .then(res => res.json())
            .then(data => {
                setCalls(data);
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
                    <PhoneCall className="w-8 h-8 text-neutral-400" />
                    Call Logs
                </h1>
            </div>

            <div className="border border-neutral-800 bg-neutral-900/50 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-neutral-400">Loading calls...</div>
                ) : calls.length === 0 ? (
                    <div className="p-8 text-neutral-500 text-center">No calls logged yet.</div>
                ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Caller</th>
                                <th className="px-6 py-4 font-medium">Target Intent</th>
                                <th className="px-6 py-4 font-medium">Summary</th>
                                <th className="px-6 py-4 font-medium text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {calls.map((call: any) => (
                                <tr key={call.id} className="hover:bg-neutral-800/20 transition-colors">
                                    <td className="px-6 py-4 text-neutral-400">
                                        {new Date(call.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-white font-mono text-xs">{call.caller_phone || "Unknown"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-300">
                                        {call.qualification_data?.intent_strength ? (
                                            <span className="capitalize px-2 py-0.5 rounded text-xs border border-neutral-700">{call.qualification_data.intent_strength}</span>
                                        ) : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400 max-w-xs truncate" title={call.summary}>
                                        {call.summary || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-mono text-white inline-block bg-neutral-800 px-2 py-1 rounded">
                                            {call.lead_score}
                                        </div>
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
