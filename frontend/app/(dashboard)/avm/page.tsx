"use client";

import { useState, useEffect } from "react";
import {
  Calculator,
  Database,
  TrendingUp,
  Loader2,
  MapPin,
  Shield,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ticker } from "@/components/Ticker";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

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

function fmtPkr(value: number): string {
  if (value >= 1e7) return `₨ ${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₨ ${(value / 1e5).toFixed(2)} Lakh`;
  return `₨ ${new Intl.NumberFormat("en-PK").format(Math.round(value))}`;
}

function confidenceTone(
  c: number,
): { label: string; color: string; variant: "mint" | "warning" | "danger" } {
  if (c >= 0.75) return { label: "High", color: "text-accent", variant: "mint" };
  if (c >= 0.6)
    return { label: "Medium", color: "text-yellow-400", variant: "warning" };
  return { label: "Low", color: "text-destructive", variant: "danger" };
}

const FIELD_LABEL =
  "block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2";

const SELECT_CLASS =
  "h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AvmPage() {
  const [activeTab, setActiveTab] = useState<"demo" | "data">("demo");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [prediction, setPrediction] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaUnit, setAreaUnit] = useState<"marla" | "sqft">("marla");

  const [formData, setFormData] = useState<ValuationRequest>({
    city: "Islamabad",
    property_type: "House",
    bedrooms: 3,
    baths: 3,
    area_marla: 10,
    area_sqft: undefined,
    neighbourhood: "",
    area_name: "",
    location: "",
  });

  const set =
    (key: keyof ValuationRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData((prev) => ({
        ...prev,
        [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
      }));

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const location = [formData.neighbourhood, formData.area_name]
        .filter(Boolean)
        .join(", ");

      const payload: ValuationRequest = {
        ...formData,
        neighbourhood: formData.neighbourhood || "Other",
        area_name: formData.area_name || formData.neighbourhood || "Other",
        location: location || "Other",
      };

      const res = await apiFetch("/valuation/predict", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(
        err instanceof Error ? err.message : "Prediction failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "data") return;
    apiFetch("/valuation/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      <header>
        <h1 className="font-serif text-3xl text-foreground tracking-tight flex items-center gap-3">
          <Calculator className="w-7 h-7 text-accent" />
          Price prediction model
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Automated Valuation Model — neighbourhood-aware price estimation for
          Pakistan real estate.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["demo", "data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] border-b-2 transition-colors flex items-center gap-2",
              activeTab === tab
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "demo" ? (
              <>
                <Calculator className="w-3.5 h-3.5" /> Calculator
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" /> Data management
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── DEMO TAB ── */}
      {activeTab === "demo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="col-span-12 lg:col-span-5">
            <Card>
              <CardBody className="p-6 space-y-4">
                <h2 className="font-serif text-lg text-foreground">
                  Property details
                </h2>

                <form onSubmit={handlePredict} className="space-y-4">
                  <div>
                    <label htmlFor="city" className={FIELD_LABEL}>
                      City
                    </label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={set("city")}
                      className={SELECT_CLASS}
                    >
                      <option value="Islamabad">Islamabad</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Karachi">Karachi</option>
                    </select>
                  </div>

                  <div className="space-y-3 bg-muted/40 rounded-md p-4 border border-border">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Location — more detail improves accuracy
                    </p>

                    <div>
                      <label htmlFor="neighbourhood" className={FIELD_LABEL}>
                        Neighbourhood
                        <span className="ml-1 normal-case font-sans text-[10px] text-muted-foreground">
                          (specific sub-area)
                        </span>
                      </label>
                      <Input
                        id="neighbourhood"
                        placeholder="DHA Phase 2, Bahria Sector C"
                        value={formData.neighbourhood}
                        onChange={set("neighbourhood")}
                        leftIcon={<MapPin className="w-4 h-4" />}
                      />
                    </div>

                    <div>
                      <label htmlFor="area_name" className={FIELD_LABEL}>
                        Area / society
                        <span className="ml-1 normal-case font-sans text-[10px] text-muted-foreground">
                          (broader area)
                        </span>
                      </label>
                      <Input
                        id="area_name"
                        placeholder="DHA Defence, Gulberg, B-17"
                        value={formData.area_name}
                        onChange={set("area_name")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="area" className={FIELD_LABEL + " mb-0"}>
                          Area
                        </label>
                        <div className="flex bg-muted border border-border rounded-sm p-0.5">
                          {(["marla", "sqft"] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setAreaUnit(u)}
                              className={cn(
                                "px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] rounded-sm transition-colors",
                                areaUnit === u
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        id="area"
                        type="number"
                        value={
                          areaUnit === "marla"
                            ? formData.area_marla || ""
                            : formData.area_sqft || ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                            ? Number(e.target.value)
                            : undefined;
                          if (areaUnit === "marla") {
                            setFormData((prev) => ({
                              ...prev,
                              area_marla: value,
                              area_sqft: undefined,
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              area_sqft: value,
                              area_marla: undefined,
                            }));
                          }
                        }}
                        min={1}
                        step={areaUnit === "marla" ? 0.5 : 1}
                        placeholder={areaUnit === "marla" ? "10" : "2722"}
                        mono
                      />
                    </div>
                    <div>
                      <label htmlFor="property_type" className={FIELD_LABEL}>
                        Property type
                      </label>
                      <select
                        id="property_type"
                        value={formData.property_type}
                        onChange={set("property_type")}
                        className={SELECT_CLASS}
                      >
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="bedrooms" className={FIELD_LABEL}>
                        Bedrooms
                      </label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={set("bedrooms")}
                        min={0}
                        mono
                      />
                    </div>
                    <div>
                      <label htmlFor="baths" className={FIELD_LABEL}>
                        Bathrooms
                      </label>
                      <Input
                        id="baths"
                        type="number"
                        value={formData.baths}
                        onChange={set("baths")}
                        min={0}
                        mono
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md font-mono text-[11px] uppercase tracking-[0.08em] text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Estimating…
                      </>
                    ) : (
                      "Estimate price"
                    )}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Result */}
          <div className="col-span-12 lg:col-span-7">
            {prediction ? (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <Card>
                  <CardBody className="p-8">
                    {prediction.is_premium_location && (
                      <Badge variant="warning" className="mb-4 inline-flex items-center gap-1.5">
                        <Star className="w-3 h-3 fill-current" />
                        Premium location
                      </Badge>
                    )}

                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                      Estimated market value
                    </p>
                    <div className="font-serif text-5xl text-foreground mb-1.5 leading-none">
                      <Ticker value={prediction.predicted_price_pkr} format="pkr" />
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-6">
                      Range · {fmtPkr(prediction.min_price_lakh * 1e5)} –{" "}
                      {fmtPkr(prediction.max_price_lakh * 1e5)}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-muted/40 border border-border rounded-sm p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                          Confidence
                        </div>
                        <div
                          className={cn(
                            "font-serif text-xl",
                            confidenceTone(prediction.confidence).color,
                          )}
                        >
                          {Math.round(prediction.confidence * 100)}%
                        </div>
                        <Badge
                          variant={confidenceTone(prediction.confidence).variant}
                          className="mt-1"
                        >
                          {confidenceTone(prediction.confidence).label}
                        </Badge>
                      </div>

                      <div className="bg-muted/40 border border-border rounded-sm p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                          Location data
                        </div>
                        <div
                          className={cn(
                            "font-serif text-xl",
                            prediction.confidence >= 0.75
                              ? "text-accent"
                              : "text-yellow-400",
                          )}
                        >
                          {prediction.confidence >= 0.75 ? "Specific" : "General"}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                          {prediction.confidence >= 0.75
                            ? "matched"
                            : "add neighbourhood"}
                        </div>
                      </div>

                      <div className="bg-muted/40 border border-border rounded-sm p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                          Market trend
                        </div>
                        <div className="font-serif text-xl text-accent flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> Stable
                        </div>
                      </div>
                    </div>

                    {prediction.confidence < 0.75 && (
                      <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-sm px-4 py-3 mb-4 text-xs text-yellow-400/90">
                        <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Tip: adding a specific neighbourhood (e.g. &quot;DHA Phase 2&quot;)
                        improves accuracy and tightens this estimate.
                      </div>
                    )}

                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground italic">
                      Automated estimate based on historical market data. May not
                      reflect the exact final sale price.
                    </p>
                  </CardBody>
                </Card>
              </motion.div>
            ) : (
              <Card className="h-full">
                <CardBody className="p-0">
                  <EmptyState
                    icon={<Calculator className="w-10 h-10" />}
                    title="Enter property details"
                    description="Neighbourhood and area data significantly improve accuracy."
                  />
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── DATA TAB ── */}
      {activeTab === "data" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="md:col-span-2">
            <CardBody className="p-6">
              <h2 className="font-serif text-xl text-foreground mb-5 flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                Model training data
              </h2>
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {[
                    { label: "Training samples", value: stats.total_samples, format: "number" as const },
                    { label: "R² score", value: stats.accuracy, raw: true },
                    { label: "Last retrained", value: stats.last_trained, raw: true },
                    {
                      label: "MAPE",
                      value: stats.mape_pct != null ? `${stats.mape_pct}%` : "N/A",
                      raw: true,
                    },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                        {s.label}
                      </div>
                      <div className="font-serif text-3xl text-foreground">
                        {s.raw ? (
                          s.value
                        ) : (
                          <Ticker value={s.value as number} format="number" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading stats…
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <h3 className="font-serif text-lg text-foreground mb-4">
                Feature importance
              </h3>
              {stats?.features?.length ? (
                <div className="space-y-3">
                  {stats.features.map((f, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{f.name}</span>
                        <span className="font-mono text-foreground">
                          {f.importance}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(f.importance, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  No feature data available
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <h3 className="font-serif text-lg text-foreground mb-4">Model info</h3>
              <div className="space-y-2.5">
                {[
                  ["Algorithm", stats?.model_type ?? "GradientBoostingRegressor"],
                  ["Test split", "15%"],
                  ["Mean absolute error", `₨ ${stats?.mae ?? "N/A"}`],
                  ["Cities", stats?.cities?.join(", ") ?? "N/A"],
                  ["Property types", stats?.property_types?.join(", ") ?? "N/A"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between items-baseline gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground shrink-0">
                      {k}
                    </span>
                    <span className="font-mono text-sm text-foreground text-right">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
