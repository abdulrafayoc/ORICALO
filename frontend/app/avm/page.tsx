"use client";

import { useState, useEffect } from "react";
import { Calculator, Database, TrendingUp, Loader2, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function AvmPage() {
    const [activeTab, setActiveTab] = useState<'demo' | 'data'>('demo');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [prediction, setPrediction] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        city: "Lahore",
        location: "",
        property_type: "House",
        bedrooms: 3,
        baths: 3,
        area_marla: 10
    });

    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await apiFetch("/valuation/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            setPrediction(data);
        } catch (err) {
            console.error("Prediction failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'data') {
            apiFetch("/valuation/stats")
                .then(res => res.json())
                .catch(err => console.error("Failed to fetch stats:", err))
                .then(data => setStats(data));
        }
    }, [activeTab]);

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-emerald-500" />
                    Price Prediction Model
                </h1>
                <p className="text-neutral-400 mt-2">
                    Automated Valuation Model (AVM) for estimating property prices in Pakistan.
                </p>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 mb-8">
                <button
                    onClick={() => setActiveTab('demo')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'demo'
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                >
                    <Calculator className="w-4 h-4" /> Calculator
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'data'
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                >
                    <Database className="w-4 h-4" /> Data Management
                </button>
            </div>

            {activeTab === 'demo' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Form */}
                    <div className="col-span-12 lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Property Details</h2>
                        <form onSubmit={handlePredict} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">City</label>
                                <select
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="Lahore">Lahore</option>
                                    <option value="Karachi">Karachi</option>
                                    <option value="Islamabad">Islamabad</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">Location / Area</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                                    <input
                                        type="text"
                                        placeholder="e.g. DHA Phase 6"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full bg-black border border-neutral-800 rounded-md pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">Area (Marla)</label>
                                    <input
                                        type="number"
                                        value={formData.area_marla}
                                        onChange={(e) => setFormData({ ...formData, area_marla: Number(e.target.value) })}
                                        className="w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">Property Type</label>
                                    <select
                                        value={formData.property_type}
                                        onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                                        className="w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="House">House</option>
                                        <option value="Flat">Flat</option>
                                        <option value="Plot">Plot</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">Bedrooms</label>
                                    <input
                                        type="number"
                                        value={formData.bedrooms}
                                        onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                                        className="w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">Bathrooms</label>
                                    <input
                                        type="number"
                                        value={formData.baths}
                                        onChange={(e) => setFormData({ ...formData, baths: Number(e.target.value) })}
                                        className="w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-md font-medium transition-colors mt-4 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Estimate Price
                            </button>
                        </form>
                    </div>

                    {/* Result */}
                    <div className="col-span-12 lg:col-span-7 space-y-6">
                        {prediction ? (
                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-neutral-400 font-medium mb-1">Estimated Market Value</h3>
                                <div className="text-4xl font-bold text-white mb-2">
                                    PKR {new Intl.NumberFormat().format(prediction.predicted_price_pkr)}
                                </div>
                                <div className="text-sm text-neutral-500 mb-8">
                                    Range: {prediction.min_price_lakh.toFixed(2)} - {prediction.max_price_lakh.toFixed(2)} Lakh
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-black/50 p-4 rounded-lg">
                                        <div className="text-xs text-neutral-500 mb-1">Confidence Score</div>
                                        <div className="text-xl font-semibold text-emerald-400">
                                            {(prediction.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div className="bg-black/50 p-4 rounded-lg">
                                        <div className="text-xs text-neutral-500 mb-1">Market Trend</div>
                                        <div className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" /> Stable
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-neutral-600 italic">
                                    * This evaluation is an automated estimate based on market data and may not reflect the exact final sale price.
                                </div>
                            </div>
                        ) : (
                            <div className="h-full bg-neutral-900/50 border border-neutral-800 border-dashed rounded-lg flex flex-col items-center justify-center text-neutral-500 p-12">
                                <Calculator className="w-12 h-12 mb-4 opacity-20" />
                                <p>Enter property details to generate a valuation.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-neutral-400" />
                            Model Training Data
                        </h2>
                        {stats ? (
                            <div className="grid grid-cols-3 gap-8">
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">Training Samples</div>
                                    <div className="text-3xl font-bold text-white">{stats.total_samples}</div>
                                </div>
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">Model Accuracy (R²)</div>
                                    <div className="text-3xl font-bold text-white">{stats.accuracy}</div>
                                </div>
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">Last Retrained</div>
                                    <div className="text-3xl font-bold text-white">{stats.last_trained}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-neutral-500 italic">Loading stats...</div>
                        )}
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-white mb-3">Feature Importance</h3>
                        <div className="space-y-3">
                            {stats?.features?.map((f: any, i: number) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">{f.name}</span>
                                        <span className="text-white">{f.importance}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${f.importance}%` }} />
                                    </div>
                                </div>
                            )) || <div className="text-neutral-500 text-sm">No feature data available.</div>}
                        </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-white mb-3">Model Info</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-neutral-800 pb-2">
                                <span className="text-neutral-400">Algorithm</span>
                                <span className="text-white font-mono">Gradient Boosting Regressor</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-800 pb-2">
                                <span className="text-neutral-400">Test Split</span>
                                <span className="text-white font-mono">20%</span>
                            </div>
                            <div className="flex justify-between border-b border-neutral-800 pb-2">
                                <span className="text-neutral-400">Mean Absolute Error</span>
                                <span className="text-white font-mono">PKR {stats?.mae || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
