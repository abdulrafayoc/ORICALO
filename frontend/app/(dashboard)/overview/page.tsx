"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  PhoneCall,
  Flame,
  TrendingUp,
  Mic,
  ArrowRight,
  History,
  RefreshCw,
  Clock,
  DollarSign,
  Target,
  BarChart2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BrandMark } from "@/components/ui/brand-mark";
import { Ticker } from "@/components/Ticker";
import { cn } from "@/lib/utils";
import { fadeUp, stagger } from "@/lib/motion";

interface Kpis {
  total_calls?: number;
  qualified_leads?: number;
  pii_redacted_pct?: number;
  avg_duration?: string;
}

interface Activity {
  id: number | string;
  summary?: string;
  date?: string;
  lead_score?: number | string;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, activityRes] = await Promise.all([
        apiFetch("/analytics/kpis"),
        apiFetch("/analytics/recent-calls?limit=5"),
      ]);
      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (activityRes.ok) setRecentActivity(await activityRes.json());
    } catch (err) {
      console.error("Overview data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    {
      label: "Total calls",
      value: Number(kpis?.total_calls ?? 0),
      icon: PhoneCall,
      format: "number" as const,
      trend: "+12%",
    },
    {
      label: "Qualified leads",
      value: Number(kpis?.qualified_leads ?? 0),
      icon: Flame,
      format: "number" as const,
      trend: "+8%",
    },
    {
      label: "PII redacted",
      value: Number(kpis?.pii_redacted_pct ?? 100),
      icon: Users,
      format: "number" as const,
      suffix: "%",
      trend: "100%",
    },
    {
      label: "Avg duration",
      raw: kpis?.avg_duration ?? "0s",
      icon: Clock,
      trend: "-5%",
    },
    {
      label: "Conversion rate",
      raw: "24.5%",
      icon: Target,
      trend: "+3%",
    },
    {
      label: "Revenue",
      raw: "$12.4K",
      icon: DollarSign,
      trend: "+15%",
    },
  ];

  const performance = [
    { label: "Call success rate", value: 94 },
    { label: "Lead quality", value: 78 },
    { label: "Response time", value: 89 },
  ];

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {new Date().toLocaleDateString("en-PK", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            {greeting()},{" "}
            <span className="italic text-accent">
              {user?.full_name?.split(" ")[0] || "agent"}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here&apos;s your business overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/voice-agent">
            <Button>
              <Mic className="w-4 h-4" />
              New call
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger(0.05)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} variants={fadeUp}>
                <Card live>
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-muted border border-border p-1.5 rounded-sm">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-accent">
                        <TrendingUp className="w-2.5 h-2.5" />
                        {stat.trend}
                      </div>
                    </div>
                    <div className="font-serif text-2xl text-foreground mb-1">
                      {"raw" in stat ? (
                        stat.raw
                      ) : (
                        <>
                          <Ticker value={stat.value as number} format={stat.format ?? "number"} />
                          {(stat as { suffix?: string }).suffix || ""}
                        </>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-muted border border-border p-1.5 rounded-sm">
                <History className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-serif text-base text-foreground">
                  Recent activity
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-0.5">
                  Latest call sessions
                </p>
              </div>
            </div>
            <Link
              href="/analytics"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<History className="w-10 h-10" />}
              title="No recent activity"
              description="When the voice agent handles a call, it will appear here."
            />
          ) : (
            <div>
              {recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-sm border border-accent/40 bg-background flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.1em] text-accent flex-shrink-0">
                      #{String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-base text-foreground">
                        Session {activity.id}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-md mt-0.5">
                        {activity.summary || "No summary available"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {activity.date || "Today"}
                    </span>
                    {activity.lead_score != null && (
                      <Badge
                        variant={
                          Number(activity.lead_score) > 70 ? "mint" : "warning"
                        }
                      >
                        Score · {activity.lead_score}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-5">
          {/* Voice CTA */}
          <Card className="relative overflow-hidden border-accent/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] -z-10" />
            <CardBody className="p-6 relative">
              <BrandMark size={36} pulse className="mb-4" />
              <h3 className="font-serif text-xl text-foreground mb-1.5">
                Start voice session
              </h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Launch a real-time conversation with your AI agent in Urdu.
              </p>
              <Link href="/voice-agent">
                <Button className="w-full">
                  <Mic className="w-4 h-4" />
                  Start now
                </Button>
              </Link>
            </CardBody>
          </Card>

          {/* Performance */}
          <Card>
            <CardBody className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-muted border border-border p-1.5 rounded-sm">
                  <BarChart2 className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-serif text-base text-foreground">
                    Performance
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    This week
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {performance.map((p) => (
                  <div key={p.label}>
                    <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] mb-1.5">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="text-foreground">{p.value}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-700"
                        style={{ width: `${p.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
