"use client";

import { useState, useEffect } from "react";
import { Search, Database, FileText, Loader2, Info } from "lucide-react";

export default function RagPage() {
    const [activeTab, setActiveTab] = useState<'demo' | 'data'>('demo');
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Management State
    const [showModal, setShowModal] = useState(false);
    const [editingListing, setEditingListing] = useState<any>(undefined);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/rag/query", {
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
            fetch("http://127.0.0.1:8000/rag/stats")
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
                        // Force refresh logic would go here, simpler to just reload page for now or trigger re-fetch if we lifted state
                        // Ideally pass a refresh callback to table. For MVP let's reload window or use a context.
                        // Actually, let's just make the user click the tab again or similar. 
                        // To be better, we should lift standard CRUD state. 
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}

// Sub-component for listing table
function ListingsTable({ onEdit }: { onEdit: (item: any) => void }) {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchListings = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/agency/listings");
            if (res.ok) {
                const data = await res.json();
                setListings(data);
            }
        } catch (error) {
            console.error("Failed to fetch listings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/agency/listings/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchListings(); // Refresh
            }
        } catch (error) {
            console.error("Failed to delete listing:", error);
        }
    }

    useEffect(() => {
        fetchListings();
    }, []);

    if (loading) return <tr><td colSpan={5} className="px-6 py-8 text-center">Loading listings...</td></tr>;
    if (listings.length === 0) return <tr><td colSpan={5} className="px-6 py-8 text-center">No listings found in database.</td></tr>;

    return (
        <>
            {listings.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{item.id}</td>
                    <td className="px-6 py-4 text-white font-medium">{item.title}</td>
                    <td className="px-6 py-4">{item.location}</td>
                    <td className="px-6 py-4 font-mono text-emerald-500">{item.price}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                            onClick={() => onEdit(item)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium hover:underline"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium hover:underline"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            ))}
        </>
    );
}

interface ListingModalProps {
    listing?: any;
    onClose: () => void;
    onSave: () => void;
}

function ListingModal({ listing, onClose, onSave }: ListingModalProps) {
    const isEdit = !!listing;
    const [formData, setFormData] = useState({
        title: listing?.title || "",
        price: listing?.price || "",
        location: listing?.location || "",
        city: listing?.city || "Lahore",
        type: listing?.type || "House",
        bedrooms: listing?.bedrooms || "",
        baths: listing?.baths || "",
        area: listing?.area || "",
        features: listing?.features ? (Array.isArray(listing.features) ? listing.features.join(", ") : listing.features) : "",
        description: listing?.description || ""
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Process features
        const processedData = {
            ...formData,
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
            baths: formData.baths ? parseInt(formData.baths) : null,
            features: formData.features.split(",").map((s: string) => s.trim()).filter((s: string) => s)
        };

        const url = isEdit
            ? `http://127.0.0.1:8000/agency/listings/${listing.id}`
            : "http://127.0.0.1:8000/agency/listings";

        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(processedData)
            });
            if (res.ok) {
                onSave();
            } else {
                alert("Failed to save listing");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving listing");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                    <h3 className="text-xl font-bold text-white">{isEdit ? "Edit Listing" : "New Listing"}</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Title</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Price</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="e.g. 2.5 Crore"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Location</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">City</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Type</label>
                            <select className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="House">House</option>
                                <option value="Flat">Flat</option>
                                <option value="Plot">Plot</option>
                                <option value="Commercial">Commercial</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 col-span-2">
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Beds</label>
                                <input type="number" className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Baths</label>
                                <input type="number" className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.baths} onChange={e => setFormData({ ...formData, baths: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Area</label>
                                <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} placeholder="e.g. 10 Marla"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Features (comma separated)</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Description</label>
                            <textarea className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none h-24"
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : "Save Listing"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
