"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  UserCircle2,
  Phone,
  AlertCircle,
  Plus,
  Calendar,
  CheckSquare,
  Building2,
  Zap,
  Users,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadModal } from "./components/LeadModal";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardMeta, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticker } from "@/components/Ticker";
import { spring, slideIn } from "@/lib/motion";

interface Lead {
  id: number;
  name: string;
  phone_number: string;
  email: string | null;
  status: string;
  needs_human: boolean;
  budget: string | null;
  location_pref: string | null;
  timeline: string | null;
  lead_score: number;
  updated_at: string;
}

type Status = "HOT" | "WARM" | "COLD" | "CLOSED" | "NEW";

function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  if (s === "HOT") return <Badge variant="danger">HOT</Badge>;
  if (s === "WARM") return <Badge variant="warning">WARM</Badge>;
  if (s === "CLOSED") return <Badge variant="mint">CLOSED</Badge>;
  if (s === "COLD") return <Badge variant="neutral">COLD</Badge>;
  return <Badge variant="neutral">NEW</Badge>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  accent?: "danger" | "warning";
}) {
  const tone =
    accent === "danger"
      ? "text-destructive"
      : accent === "warning"
        ? "text-yellow-400"
        : "text-foreground";
  return (
    <Card>
      <CardBody className="relative overflow-hidden p-5">
        <div className="absolute top-3 right-3 opacity-10">
          <Icon className="w-12 h-12" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </div>
        <div className={cn("font-serif text-4xl mt-2", tone)}>
          {typeof value === "number" ? <Ticker value={value} format="number" /> : value}
        </div>
      </CardBody>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group">
      <Card live className="h-full">
        <CardBody className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Icon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="font-serif text-base text-foreground group-hover:text-accent transition-colors">
                {title}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-0.5">
                {desc}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export default function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = () => {
    apiFetch("/crm/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch leads", err);
        setLeads([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const hotCount = leads.filter((l) => l.status === "HOT").length;
  const requireHumanCount = leads.filter((l) => l.needs_human).length;

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            Lead intelligence
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage voice AI prospects and follow-ups.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          Add lead
        </Button>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total leads" value={loading ? "—" : leads.length} icon={Users} />
        <StatCard label="Hot prospects" value={loading ? "—" : hotCount} icon={Zap} accent="danger" />
        <StatCard label="Needs follow-up" value={loading ? "—" : requireHumanCount} icon={AlertCircle} accent="warning" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          href="/crm/schedules"
          icon={Calendar}
          title="Property visits"
          desc="Schedule & manage viewings"
        />
        <QuickAction
          href="/crm/follow-ups"
          icon={CheckSquare}
          title="Follow-ups"
          desc="Track pending actions"
        />
        <QuickAction
          href="/crm/pipeline"
          icon={Building2}
          title="Pipeline"
          desc="View sales pipeline"
        />
      </div>

      {/* Leads list */}
      <Card>
        <CardHeader>
          <CardTitle>Prospects roster</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={<Phone className="w-10 h-10" />}
              title="No leads yet"
              description="Start a voice call to capture your first prospect — qualified leads land here automatically."
            />
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-3 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                <div className="col-span-4">Lead</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Budget</div>
                <div className="col-span-1">Score</div>
                <div className="col-span-1 text-right">Open</div>
              </div>
              <AnimatePresence initial={false}>
                {leads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    layout
                    variants={slideIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={spring.gentle}
                    className="grid grid-cols-12 gap-3 px-3 py-3 items-center border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-serif text-foreground text-sm">
                        {lead.name === "Unknown Caller" ? (
                          <UserCircle2 className="w-4 h-4 opacity-70" />
                        ) : (
                          lead.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground text-sm truncate">{lead.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          {lead.phone_number || "no phone"}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <StatusBadge status={lead.status} />
                      {lead.needs_human && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-yellow-400">
                          ·human
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 truncate text-sm text-muted-foreground">
                      {lead.location_pref || "—"}
                    </div>
                    <div className="col-span-2 font-mono text-sm text-foreground">
                      {lead.budget || "—"}
                    </div>
                    <div className="col-span-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-sm",
                          lead.lead_score >= 70 ? "text-accent" : "text-muted-foreground",
                        )}
                      >
                        {lead.lead_score}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <Link
                        href={`/crm/${lead.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardBody>
      </Card>

      {showModal && (
        <LeadModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
