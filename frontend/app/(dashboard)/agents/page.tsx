"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Trash2, Power, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);

    useEffect(() => {
        apiFetch("/agents/")
            .then(res => res.json())
            .then(d => setAgents(Array.isArray(d) ? d : []))
            .catch(err => console.error("Failed to fetch agents", err));
    }, []);

    const handleDeleteAgent = async (agentId: number, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (!confirm("Are you sure you want to delete this agent?")) {
            return;
        }
        
        try {
            const response = await apiFetch(`/agents/${agentId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                setAgents(agents.filter(agent => agent.id !== agentId));
            } else {
                throw new Error('Failed to delete agent');
            }
        } catch (err) {
            console.error("Error deleting agent:", err);
            alert("Failed to delete agent. Please try again.");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">AI Agents</h1>
                    <p className="text-slate-400 mt-1">Manage your AI personas and configurations</p>
                </div>
                <Link
                    href="/agents/new"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" />
                    New Agent
                </Link>
            </header>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search agents..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <Link key={agent.id} href={`/agents/${agent.id}`} className="group block">
                        <div className="h-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-slate-700 hover:bg-slate-900/70 transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                                    <span className="text-indigo-400 font-bold text-sm">AI</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                    <span className="text-xs text-slate-500">{agent.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors mb-2">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-4">
                                {agent.description || "No description provided."}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                <span className="text-xs font-mono text-slate-500">{agent.slug}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => handleDeleteAgent(agent.id, e)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                        title="Delete agent"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Create New Agent Card */}
                <Link href="/agents/new" className="group block">
                    <div className="h-full bg-transparent border-2 border-dashed border-slate-800 rounded-xl p-6 hover:bg-slate-900/30 hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-indigo-400">
                        <div className="w-12 h-12 rounded-xl bg-slate-800/50 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium">Create New Agent</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
