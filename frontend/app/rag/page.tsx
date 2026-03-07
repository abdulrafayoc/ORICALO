"use client";

import { useState, useEffect } from "react";
import { Search, Database, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ListingsTable } from "@/components/ListingsTable";
import { ListingModal } from "@/components/ListingModal";

export default function RagPage() {
    const [activeTab, setActiveTab] = useState<'demo' | 'data'>('demo');
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingListing, setEditingListing] = useState<any>(undefined);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await apiFetch("/rag/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, top_k: 5 })
            });
            const data = await res.json();
            setResults(data.results || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'data') {
            apiFetch("/rag/stats")
                .then(res => res.json())
                .catch(err => console.error("Failed to fetch stats:", err))
                .then(data => setStats(data));
        }
    }, [activeTab]);

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Search className="w-8 h-8 text-blue-500" />
                    RAG Knowledge Base
                </h1>
                <p className="text-neutral-400 mt-2">
                    Search through the Oricalo property database using semantic retrieval.
                </p>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 mb-8">
                <button
                    onClick={() => setActiveTab('demo')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'demo'
                        ? "border-blue-500 text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                >
                    <Search className="w-4 h-4" /> Live Demo
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'data'
                        ? "border-blue-500 text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                >
                    <Database className="w-4 h-4" /> Data Management
                </button>
            </div>

            {activeTab === 'demo' ? (
                <div className="space-y-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., '3 marla house in DHA Phase 6 under 2 crore'"
                            className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Search
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.map((item, idx) => (
                            <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 hover:border-neutral-700 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-mono bg-neutral-800 text-neutral-300 px-2 py-1 rounded">Score: {(item.score * 100).toFixed(1)}%</span>
                                    {item.metadata?.price && (
                                        <span className="text-emerald-400 font-semibold">{item.metadata.price}</span>
                                    )}
                                </div>
                                <h3 className="text-white font-medium mb-2 line-clamp-2">
                                    {item.text.substring(0, 100)}...
                                </h3>
                                <p className="text-neutral-400 text-sm line-clamp-3 mb-4">
                                    {item.text}
                                </p>
                                <div className="text-xs text-neutral-500 font-mono flex gap-2">
                                    <span className="flex items-center gap-1">📍 {item.metadata?.location || "Unknown"}</span>
                                    {item.metadata?.source && <span>• {item.metadata.source}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!loading && results.length === 0 && query && (
                        <div className="text-center py-12 text-neutral-500">
                            No results found for your query.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Database className="w-5 h-5 text-neutral-400" />
                            Agency Listings
                        </h2>
                        <button
                            onClick={() => {
                                setEditingListing(undefined);
                                setShowModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            + Add Listing
                        </button>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-neutral-400">
                                <thead className="bg-black/20 text-xs uppercase text-neutral-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3">Title</th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Price</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    <ListingsTable onEdit={(item) => {
                                        setEditingListing(item);
                                        setShowModal(true);
                                    }} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <ListingModal
                    listing={editingListing}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
