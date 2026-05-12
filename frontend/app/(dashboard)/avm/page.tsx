"use client";

import { useState, useEffect } from "react";
import { Calculator, Database, TrendingUp, Loader2, MapPin, Shield, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

interface ValuationRequest {
    city: string;
    property_type: string;
    bedrooms: number;
    baths: number;
    area_sqft?: number;
    area_marla?: number;
    neighbourhood?: string;
    area_name?: string;
    location?: string;
}

interface ValuationResponse {
    predicted_price_pkr: number;
    min_price_lakh: number;
    max_price_lakh: number;
    currency: string;
    confidence: number;
    is_premium_location: boolean;
}

interface FeatureImportance {
    name: string;
    importance: number;
}

interface ModelStats {
    total_samples: number;
    accuracy: number;
    last_trained: string;
    mae: string;
    mape_pct?: number;
    model_type?: string;
    cities?: string[];
    property_types?: string[];
    features: FeatureImportance[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPkr(value: number): string {
    if (value >= 1e7) return `₨ ${(value / 1e7).toFixed(2)} Crore`;
    if (value >= 1e5) return `₨ ${(value / 1e5).toFixed(2)} Lakh`;
    return `₨ ${new Intl.NumberFormat("en-PK").format(Math.round(value))}`;
}

function confidenceLabel(c: number): { label: string; color: string } {
    if (c >= 0.75) return { label: "High",   color: "text-emerald-400" };
    if (c >= 0.60) return { label: "Medium", color: "text-amber-400"   };
    return              { label: "Low",    color: "text-red-400"     };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AvmPage() {
    const [activeTab,  setActiveTab]  = useState<"demo" | "data">("demo");
    const [loading,    setLoading]    = useState(false);
    const [stats,      setStats]      = useState<ModelStats | null>(null);
    const [prediction, setPrediction] = useState<ValuationResponse | null>(null);
    const [error,      setError]      = useState<string | null>(null);
    const [areaUnit,   setAreaUnit]   = useState<"marla" | "sqft">("marla");

    const [formData, setFormData] = useState<ValuationRequest>({
        city:          "Islamabad",
        property_type: "House",
        bedrooms:      3,
        baths:         3,
        area_marla:    10,
        area_sqft:     undefined,
        neighbourhood: "",   // specific sub-area  e.g. "DHA Phase 2"
        area_name:     "",   // broader area        e.g. "DHA Defence"
        location:      "",   // optional free-text  (auto-filled on submit)
    });

    // ── form field helpers ────────────────────────────────────────────────
    const set = (key: keyof ValuationRequest) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setFormData(prev => ({
                ...prev,
                [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
            }));

    // ── predict ───────────────────────────────────────────────────────────
    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // auto-build location string from neighbourhood + area_name
            const location = [formData.neighbourhood, formData.area_name]
                .filter(Boolean)
                .join(", ");

            const payload: ValuationRequest = {
                ...formData,
                neighbourhood: formData.neighbourhood || "Other",
                area_name:     formData.area_name     || formData.neighbourhood || "Other",
                location:      location               || "Other",
            };

            const res  = await apiFetch("/valuation/predict", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            setPrediction(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Prediction failed");
        } finally {
            setLoading(false);
        }
    };

    // ── stats ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== "data") return;
        apiFetch("/valuation/stats")
            .then(r => r.json())
            .then(setStats)
            .catch(err => console.error("Failed to fetch stats:", err));
    }, [activeTab]);

    // ── shared input class ────────────────────────────────────────────────
    const input =
        "w-full bg-black border border-neutral-800 rounded-md px-3 py-2 text-sm text-white " +
        "placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors";

    const label = "block text-xs font-medium text-neutral-400 mb-1";

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-emerald-500" />
                    Price Prediction Model
                </h1>
                <p className="text-neutral-400 mt-2">
                    Automated Valuation Model (AVM) — neighbourhood-aware price estimation for
                    Pakistan real estate.
                </p>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 mb-8">
                {(["demo", "data"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === tab
                                ? "border-emerald-500 text-white"
                                : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                    >
                        {tab === "demo" ? <><Calculator className="w-4 h-4" /> Calculator</> : <><Database className="w-4 h-4" /> Data Management</>}
                    </button>
                ))}
            </div>

            {/* ── DEMO TAB ── */}
            {activeTab === "demo" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Form */}
                    <div className="col-span-12 lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Property Details</h2>

                        <form onSubmit={handlePredict} className="space-y-4">

                            {/* City */}
                            <div>
                                <label className={label}>City</label>
                                <select value={formData.city} onChange={set("city")} className={input}>
                                    <option value="Islamabad">Islamabad</option>
                                    <option value="Lahore">Lahore</option>
                                    <option value="Karachi">Karachi</option>
                                </select>
                            </div>

                            {/* Location fields */}
                            <div className="space-y-3 bg-neutral-800/40 rounded-lg p-3 border border-neutral-700/50">
                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                                    Location — more detail = better accuracy
                                </p>

                                {/* Neighbourhood */}
                                <div>
                                    <label className={label}>
                                        Neighbourhood
                                        <span className="ml-1 text-neutral-600 font-normal">(specific sub-area)</span>
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                                        <input
                                            type="text"
                                            placeholder="e.g. DHA Phase 2, Bahria Town Sector C"
                                            value={formData.neighbourhood}
                                            onChange={set("neighbourhood")}
                                            className={`${input} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* Area Name */}
                                <div>
                                    <label className={label}>
                                        Area / Society
                                        <span className="ml-1 text-neutral-600 font-normal">(broader area)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. DHA Defence, Gulberg, B-17"
                                        value={formData.area_name}
                                        onChange={set("area_name")}
                                        className={input}
                                    />
                                </div>
                            </div>

                            {/* Area + Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={label}>Area</label>
                                        <div className="flex bg-black border border-neutral-800 rounded-md p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setAreaUnit("marla")}
                                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                                    areaUnit === "marla" 
                                                        ? "bg-emerald-600 text-white" 
                                                        : "text-neutral-500 hover:text-neutral-300"
                                                }`}
                                            >
                                                Marla
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAreaUnit("sqft")}
                                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                                    areaUnit === "sqft" 
                                                        ? "bg-emerald-600 text-white" 
                                                        : "text-neutral-500 hover:text-neutral-300"
                                                }`}
                                            >
                                                SqFt
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        value={areaUnit === "marla" ? formData.area_marla || "" : formData.area_sqft || ""}
                                        onChange={(e) => {
                                            const value = e.target.value ? Number(e.target.value) : undefined;
                                            if (areaUnit === "marla") {
                                                setFormData(prev => ({ ...prev, area_marla: value, area_sqft: undefined }));
                                            } else {
                                                setFormData(prev => ({ ...prev, area_sqft: value, area_marla: undefined }));
                                            }
                                        }}
                                        className={input}
                                        min="1"
                                        step={areaUnit === "marla" ? "0.5" : "1"}
                                        placeholder={areaUnit === "marla" ? "e.g. 10" : "e.g. 2722"}
                                    />
                                </div>
                                <div>
                                    <label className={label}>Property Type</label>
                                    <select value={formData.property_type} onChange={set("property_type")} className={input}>
                                        <option value="House">House</option>
                                        <option value="Apartment">Apartment</option>
                                        <option value="Flat">Flat</option>
                                        <option value="Villa">Villa</option>
                                        <option value="Upper Portion">Upper Portion</option>
                                        <option value="Portion">Portion</option>
                                        <option value="Room">Room</option>
                                    </select>
                                </div>
                            </div>

                            {/* Beds + Baths */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>Bedrooms</label>
                                    <input type="number" value={formData.bedrooms} onChange={set("bedrooms")} className={input} min="0" />
                                </div>
                                <div>
                                    <label className={label}>Bathrooms</label>
                                    <input type="number" value={formData.baths}    onChange={set("baths")}    className={input} min="0" />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-md font-medium transition-colors mt-2 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Estimating…</>
                                    : "Estimate Price"
                                }
                            </button>
                        </form>
                    </div>

                    {/* Result */}
                    <div className="col-span-12 lg:col-span-7 space-y-4">
                        {prediction ? (
                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">

                                {/* Premium badge */}
                                {prediction.is_premium_location && (
                                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full mb-4">
                                        <Star className="w-3 h-3 fill-current" />
                                        Premium Location
                                    </div>
                                )}

                                <p className="text-neutral-400 font-medium mb-1">Estimated Market Value</p>
                                <div className="text-4xl font-bold text-white mb-1">
                                    {fmtPkr(prediction.predicted_price_pkr)}
                                </div>
                                <div className="text-sm text-neutral-500 mb-6">
                                    Range: {fmtPkr(prediction.min_price_lakh * 1e5)} – {fmtPkr(prediction.max_price_lakh * 1e5)}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {/* Confidence */}
                                    <div className="bg-black/50 p-4 rounded-lg">
                                        <div className="text-xs text-neutral-500 mb-1">Confidence</div>
                                        <div className={`text-xl font-semibold ${confidenceLabel(prediction.confidence).color}`}>
                                            {(prediction.confidence * 100).toFixed(0)}%
                                        </div>
                                        <div className={`text-xs mt-0.5 ${confidenceLabel(prediction.confidence).color} opacity-70`}>
                                            {confidenceLabel(prediction.confidence).label}
                                        </div>
                                    </div>

                                    {/* Location quality */}
                                    <div className="bg-black/50 p-4 rounded-lg">
                                        <div className="text-xs text-neutral-500 mb-1">Location Data</div>
                                        <div className={`text-xl font-semibold ${prediction.confidence >= 0.75 ? "text-emerald-400" : "text-amber-400"}`}>
                                            {prediction.confidence >= 0.75 ? "Specific" : "General"}
                                        </div>
                                        <div className="text-xs mt-0.5 text-neutral-600">
                                            {prediction.confidence >= 0.75 ? "neighbourhood matched" : "add neighbourhood"}
                                        </div>
                                    </div>

                                    {/* Trend */}
                                    <div className="bg-black/50 p-4 rounded-lg">
                                        <div className="text-xs text-neutral-500 mb-1">Market Trend</div>
                                        <div className="text-xl font-semibold text-blue-400 flex items-center gap-1.5">
                                            <TrendingUp className="w-4 h-4" /> Stable
                                        </div>
                                    </div>
                                </div>

                                {/* Confidence tip when low */}
                                {prediction.confidence < 0.75 && (
                                    <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 mb-4 text-xs text-amber-400/80">
                                        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                                        Tip: adding a specific Neighbourhood (e.g. "DHA Phase 2") improves accuracy and tightens this estimate.
                                    </div>
                                )}

                                <p className="text-xs text-neutral-600 italic">
                                    * Automated estimate based on historical market data. May not reflect the exact final sale price.
                                </p>
                            </div>
                        ) : (
                            <div className="h-full min-h-64 bg-neutral-900/50 border border-dashed border-neutral-800 rounded-lg flex flex-col items-center justify-center text-neutral-600 p-12">
                                <Calculator className="w-12 h-12 mb-4 opacity-20" />
                                <p>Enter property details to generate a valuation.</p>
                                <p className="text-xs mt-2 opacity-60">Neighbourhood and area data significantly improve accuracy.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── DATA TAB ── */}
            {activeTab === "data" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Top stats banner */}
                    <div className="col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-neutral-400" />
                            Model Training Data
                        </h2>
                        {stats ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">Training Samples</div>
                                    <div className="text-3xl font-bold text-white">
                                        {stats.total_samples.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">R² Score</div>
                                    <div className="text-3xl font-bold text-white">{stats.accuracy}</div>
                                </div>
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">Last Retrained</div>
                                    <div className="text-3xl font-bold text-white">{stats.last_trained}</div>
                                </div>
                                <div>
                                    <div className="text-neutral-500 text-sm mb-1">MAPE</div>
                                    <div className="text-3xl font-bold text-white">
                                        {stats.mape_pct != null ? `${stats.mape_pct}%` : "N/A"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-neutral-500 italic">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading stats…
                            </div>
                        )}
                    </div>

                    {/* Feature importance */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Feature Importance</h3>
                        {stats?.features?.length ? (
                            <div className="space-y-3">
                                {stats.features.map((f, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-400">{f.name}</span>
                                            <span className="text-white font-mono">{f.importance}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(f.importance, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-neutral-500 text-sm">No feature data available.</p>
                        )}
                    </div>

                    {/* Model info */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Model Info</h3>
                        <div className="space-y-3">
                            {[
                                ["Algorithm",          stats?.model_type ?? "GradientBoostingRegressor"],
                                ["Test Split",         "15%"],
                                ["Mean Absolute Error",`PKR ${stats?.mae ?? "N/A"}`],
                                ["Cities",             stats?.cities?.join(", ") ?? "N/A"],
                                ["Property Types",     stats?.property_types?.join(", ") ?? "N/A"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between border-b border-neutral-800 pb-2 last:border-0 last:pb-0 gap-4">
                                    <span className="text-neutral-400 text-sm shrink-0">{k}</span>
                                    <span className="text-white font-mono text-sm text-right">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}