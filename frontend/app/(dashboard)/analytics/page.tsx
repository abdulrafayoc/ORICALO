"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  ShieldCheck,
  Users,
  Clock,
  AlertCircle,
  Terminal,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticker } from "@/components/Ticker";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

interface KPIStats {
  total_calls: number;
  qualified_leads: number;
  pii_redacted_pct: number;
  avg_duration: string;
}

interface CallDetail {
  id: string;
  date: string;
  status: string;
  summary: string;
  transcript: { role: string; text: string }[];
}

export default function AnalyticsDashboard() {
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, callsRes] = await Promise.all([
          apiFetch("/analytics/kpis"),
          apiFetch("/analytics/recent-calls?limit=5"),
        ]);
        if (kpiRes.ok) setKpis(await kpiRes.json());
        if (callsRes.ok) setRecentCalls(await callsRes.json());
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const callToDisplay = recentCalls.length > 0 ? recentCalls[0]! : null;

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const kpiTiles = [
    {
      icon: Users,
      label: "Total calls",
      value: kpis?.total_calls ?? 0,
      format: "number" as const,
    },
    {
      icon: ShieldCheck,
      label: "PII redacted",
      value: kpis?.pii_redacted_pct ?? 100,
      format: "number" as const,
      suffix: "%",
      accent: true,
    },
    {
      icon: AlertCircle,
      label: "Qualified leads",
      value: kpis?.qualified_leads ?? 0,
      format: "number" as const,
    },
    {
      icon: Clock,
      label: "Avg duration",
      raw: kpis?.avg_duration ?? "0s",
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-accent" />
            Post-call analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review call summaries, KPIs, and PII-redacted safe transcripts.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label}>
              <CardBody className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      tile.accent ? "text-accent" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.15em]",
                      tile.accent ? "text-accent" : "text-muted-foreground",
                    )}
                  >
                    {tile.label}
                  </span>
                </div>
                <div className="font-serif text-4xl text-foreground leading-none">
                  {"raw" in tile && tile.raw !== undefined ? (
                    tile.raw
                  ) : (
                    <>
                      <Ticker value={tile.value as number} format={tile.format ?? "number"} />
                      {(tile as { suffix?: string }).suffix || ""}
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Recent call detail */}
      {callToDisplay ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card>
            <div className="flex flex-col md:flex-row overflow-hidden">
              {/* Meta + summary */}
              <div className="w-full md:w-1/3 p-6 border-r border-border bg-muted/30">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Session ID
                    </div>
                    <div className="font-mono text-sm text-foreground mt-1">
                      {callToDisplay.id}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2">
                      {callToDisplay.date}
                    </div>
                  </div>
                  <Badge variant="mint">{callToDisplay.status}</Badge>
                </div>

                <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  AI summary
                </h3>
                <p className="text-sm text-foreground leading-relaxed mb-6">
                  {callToDisplay.summary}
                </p>

                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent bg-accent/5 p-3 rounded-sm border border-accent/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PII automatically redacted · CNIC, phone
                </div>
              </div>

              {/* Transcript */}
              <div className="flex-1 p-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  Redacted transcript
                </h3>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {(callToDisplay.transcript || []).map((turn, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {turn.role}
                      </span>
                      <div
                        className={cn(
                          "text-base leading-relaxed font-urdu rounded-md px-4 py-3 border",
                          turn.role === "user"
                            ? "bg-muted text-foreground border-border"
                            : "bg-accent/5 text-foreground border-accent/20",
                        )}
                      >
                        {turn.text.split(/(\[REDACTED_PHONE\]|\[REDACTED_CNIC\])/g).map(
                          (part, j) => {
                            if (
                              part === "[REDACTED_PHONE]" ||
                              part === "[REDACTED_CNIC]"
                            ) {
                              return (
                                <span
                                  key={j}
                                  className="bg-destructive/15 text-destructive font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm border border-destructive/30 mx-1"
                                >
                                  {part}
                                </span>
                              );
                            }
                            return <span key={j}>{part}</span>;
                          },
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Terminal className="w-10 h-10" />}
              title="No call data yet"
              description="Complete a call in the console or voice agent to generate analytics."
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
