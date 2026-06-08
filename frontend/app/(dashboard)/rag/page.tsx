"use client";

import { useState, useEffect } from "react";
import { Search, Database, Loader2, Plus, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { ListingsTable } from "@/components/ListingsTable";
import { ListingModal } from "@/components/ListingModal";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { spring, slideIn } from "@/lib/motion";

interface RagResult {
  text: string;
  score: number;
  metadata?: {
    price?: string;
    location?: string;
    source?: string;
  };
}

interface Listing {
  id: number;
  title?: string;
  price?: string;
  location?: string;
  city?: string;
  type?: string;
  bedrooms?: number;
  baths?: number;
  area?: string;
  features?: string[] | string;
  description?: string;
}

export default function RagPage() {
  const [activeTab, setActiveTab] = useState<"demo" | "data">("demo");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | undefined>(undefined);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/rag/query", {
        method: "POST",
        body: JSON.stringify({ query, top_k: 5 }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      <header>
        <h1 className="font-serif text-3xl text-foreground tracking-tight flex items-center gap-3">
          <Search className="w-7 h-7 text-accent" />
          RAG knowledge base
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search the ORICALO property database using semantic retrieval.
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
                <Search className="w-3.5 h-3.5" /> Live demo
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" /> Data management
              </>
            )}
          </button>
        ))}
      </div>

      {activeTab === "demo" ? (
        <div className="space-y-5">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="3 marla house in DHA Phase 6 under 2 crore"
              />
            </div>
            <Button type="submit" disabled={loading} size="md">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </Button>
          </form>

          <AnimatePresence initial={false}>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    variants={slideIn}
                    initial="hidden"
                    animate="visible"
                    transition={spring.gentle}
                  >
                    <Card live>
                      <CardBody className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="mint">
                            score · {(item.score * 100).toFixed(1)}%
                          </Badge>
                          {item.metadata?.price && (
                            <span className="font-serif text-base text-accent">
                              {item.metadata.price}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground line-clamp-2 mb-2">
                          {item.text.substring(0, 100)}…
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {item.text}
                        </p>
                        <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.metadata?.location || "unknown"}
                          </span>
                          {item.metadata?.source && (
                            <span>· {item.metadata.source}</span>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : !loading && query ? (
              <EmptyState
                icon={<Search className="w-10 h-10" />}
                title="No matches"
                description={`Nothing found for "${query}". Try a different phrasing or add more context.`}
              />
            ) : null}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              Agency listings
            </h2>
            <Button
              onClick={() => {
                setEditingListing(undefined);
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> Add listing
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      ID
                    </th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Title
                    </th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Location
                    </th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Price
                    </th>
                    <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ListingsTable
                    onEdit={(item) => {
                      setEditingListing(item as Listing);
                      setShowModal(true);
                    }}
                  />
                </tbody>
              </table>
            </div>
          </Card>
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
