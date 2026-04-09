"use client";

import { useEffect, useState } from "react";
import { Users, PhoneCall, CheckSquare, BarChart } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CRMDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/crm/stats")
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="p-8 text-neutral-400">Loading CRM dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-mono tracking-tight text-white mb-8">
                CRM Dashboard
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl">
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                        <Users className="w-5 h-5" />
                        <h3 className="font-medium">Total Contacts</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{stats?.total_contacts || 0}</p>
                </div>
                
                <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl">
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                        <PhoneCall className="w-5 h-5" />
                        <h3 className="font-medium">Calls Logged</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{stats?.total_calls || 0}</p>
                </div>

                <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl">
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                        <CheckSquare className="w-5 h-5" />
                        <h3 className="font-medium">Active Tasks</h3>
                    </div>
                    <p className="text-4xl font-bold text-white">{stats?.active_tasks || 0}</p>
                </div>
            </div>

            <div className="p-6 border border-neutral-800 bg-neutral-900/50 rounded-xl mt-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart className="w-5 h-5" /> Pipeline Overview
                </h3>
                {stats?.pipeline_stages && Object.keys(stats.pipeline_stages).length > 0 ? (
                    <div className="space-y-4">
                        {Object.entries(stats.pipeline_stages).map(([stage, count]) => (
                            <div key={stage} className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                <span className="capitalize text-neutral-300">{stage.replace('_', ' ')}</span>
                                <span className="text-white font-mono bg-neutral-800 px-3 py-1 rounded">{String(count)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-neutral-500">No contacts in pipeline yet. Make some calls!</p>
                )}
            </div>
        </div>
    );
}
