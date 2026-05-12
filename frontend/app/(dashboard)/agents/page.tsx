"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);

    useEffect(() => {
        apiFetch("/agents/")
            .then(res => res.json())
            .then(setAgents)
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
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Agents</h1>
                    <p className="text-neutral-400 mt-1">Manage your active AI personas and configurations.</p>
                </div>
                <Link
                    href="/agents/new"
                    className="bg-white text-black px-4 py-2 rounded-md font-medium text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Agent
                </Link>
            </header>

            {/* Filter / Search Bar */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search agents..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                </div>
            </div>

            {/* List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <Link key={agent.id} href={`/agents/${agent.id}`} className="group block">
                        <div className="h-full bg-neutral-900 border border-neutral-800 rounded-lg p-5 hover:border-neutral-600 transition-colors relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-md bg-neutral-800 flex items-center justify-center border border-neutral-700 text-neutral-300 font-mono text-xs">
                                    AI
                                </div>
                                <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-emerald-500' : 'bg-neutral-700'}`} />
                            </div>

                            <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors mb-2">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-neutral-400 line-clamp-2 h-10 mb-4">
                                {agent.description || "No description provided."}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                                <span className="text-xs font-mono text-neutral-500">{agent.slug}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleDeleteAgent(agent.id, e)}
                                        className="p-1 rounded text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Delete agent"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <MoreHorizontal className="w-4 h-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Empty State / Create Stub */}
                <Link href="/agents/new" className="group block">
                    <div className="h-full bg-transparent border border-dashed border-neutral-800 rounded-lg p-5 hover:bg-neutral-900/50 hover:border-neutral-700 transition-all flex flex-col items-center justify-center gap-3 text-neutral-500">
                        <Plus className="w-6 h-6" />
                        <span className="text-sm font-medium">Create New Agent</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
