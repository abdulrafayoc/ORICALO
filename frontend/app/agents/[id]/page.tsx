"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronLeft, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
    id?: number;
    name: string;
    slug: string;
    description: string;
    system_prompt: string;
    is_active: boolean;
}

const DEFAULT_AGENT: Agent = {
    name: "",
    slug: "",
    description: "",
    system_prompt: "",
    is_active: true
};

export default function AgentEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const isNew = resolvedParams.id === "new";
    const [agent, setAgent] = useState<Agent>(DEFAULT_AGENT);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isNew) {
            fetch(`http://127.0.0.1:8000/agents/${resolvedParams.id}`)
                .then(res => res.json())
                .then(setAgent)
                .catch(err => console.error(err));
        }
    }, [isNew, resolvedParams.id]);

    const handleSave = async () => {
        setSaving(true);
        const url = isNew ? "http://127.0.0.1:8000/agents/" : `http://127.0.0.1:8000/agents/${agent.id}`;
        const method = isNew ? "POST" : "PUT";

        try {
            await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(agent)
            });
            router.push("/agents");
        } catch (e) {
            alert("Error saving agent");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-neutral-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-neutral-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-white">{isNew ? "New Agent" : agent.name}</h1>
                        <div className="text-xs text-neutral-500 font-mono mt-1">{isNew ? "Draft" : agent.slug}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center gap-2"
                    >
                        {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save Configuration</>}
                    </button>
                </div>
            </div>

            {/* Split View */}
            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">

                {/* Left Panel: Settings */}
                <div className="col-span-12 lg:col-span-4 space-y-6 overflow-y-auto pr-2">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-neutral-400">General Information</label>

                        <div className="space-y-1">
                            <span className="text-xs text-neutral-500">Display Name</span>
                            <input
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-neutral-600"
                                placeholder="Agent Name"
                                value={agent.name}
                                onChange={e => setAgent({ ...agent, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-neutral-500">Slug (ID)</span>
                            <input
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-sm text-white font-mono focus:outline-none focus:border-neutral-600"
                                placeholder="unique-id"
                                value={agent.slug}
                                onChange={e => setAgent({ ...agent, slug: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-neutral-500">Description</span>
                            <textarea
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-neutral-600 h-24 resize-none"
                                placeholder="Briefly describe what this agent does..."
                                value={agent.description || ""}
                                onChange={e => setAgent({ ...agent, description: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={agent.is_active}
                                onChange={e => setAgent({ ...agent, is_active: e.target.checked })}
                                className="rounded bg-neutral-900 border-neutral-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <label htmlFor="active" className="text-sm text-neutral-300">Active / Deployable</label>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Prompt Editor */}
                <div className="col-span-12 lg:col-span-8 flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-neutral-500">system_instruction.md</span>
                        <span className="text-[10px] uppercase text-neutral-600 font-semibold tracking-wider">Editor</span>
                    </div>
                    <textarea
                        className="flex-1 w-full bg-neutral-900 p-4 font-mono text-sm text-neutral-200 focus:outline-none resize-none leading-relaxed"
                        placeholder="Define the agent's persona and constraints here..."
                        value={agent.system_prompt}
                        onChange={e => setAgent({ ...agent, system_prompt: e.target.value })}
                        spellCheck={false}
                    />
                </div>

            </div>
        </div>
    );
}
