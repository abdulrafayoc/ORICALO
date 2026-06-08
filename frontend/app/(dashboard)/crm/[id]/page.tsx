"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCircle2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Building,
  Flag,
  CheckCircle2,
  Trash2,
  Edit2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LeadModal } from "../components/LeadModal";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticker } from "@/components/Ticker";
import { fadeUp, spring } from "@/lib/motion";

interface ActionItem {
  id: number;
  task_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface CallSession {
  id: string;
  direction: string;
  transcript: { role: string; text: string }[];
  summary: string;
  duration_seconds: number;
  created_at: string;
}

interface LeadDetail {
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
  created_at: string;
  sessions: CallSession[];
  action_items: ActionItem[];
}

function statusVariant(status: string): "danger" | "warning" | "mint" | "neutral" {
  if (status === "HOT") return "danger";
  if (status === "WARM") return "warning";
  if (status === "CLOSED") return "mint";
  return "neutral";
}

export default function LeadProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");

  const [isCalling, setIsCalling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLead = () => {
    apiFetch(`/crm/leads/${resolvedParams.id}`)
      .then((res) => res.json())
      .then((data) => {
        setLead(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch lead", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          loading
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <EmptyState
        icon={<UserCircle2 className="w-10 h-10" />}
        title="Lead not found"
        description="This prospect may have been deleted or moved."
        action={
          <Link href="/crm">
            <Button variant="outline">Back to prospects</Button>
          </Link>
        }
      />
    );
  }

  const handleOutboundCall = async () => {
    if (!lead.phone_number) return alert("No phone number available");
    const pubUrl = prompt(
      "Enter your public domain (e.g., my-ngrok.io) for the Twilio webhook:",
    );
    if (!pubUrl) return;
    setIsCalling(true);
    try {
      const res = await apiFetch(`/crm/leads/${lead.id}/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_url: pubUrl }),
      });
      const data = await res.json();
      if (!res.ok) alert("Error initiating call: " + (data.detail || JSON.stringify(data)));
      else alert("Call initiated · " + data.call_sid);
    } catch (e: unknown) {
      alert("Failed to initiate call: " + (e instanceof Error ? e.message : String(e)));
    }
    setIsCalling(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this lead? All call transcripts will be destroyed.",
      )
    )
      return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/crm/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) router.push("/crm");
      else alert("Failed to delete lead");
    } catch (e: unknown) {
      alert("Error deleting lead: " + (e instanceof Error ? e.message : String(e)));
    }
    setIsDeleting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Top actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-accent transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to prospects
        </Link>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
          <Button
            size="sm"
            onClick={handleOutboundCall}
            disabled={isCalling || !lead.phone_number}
          >
            <Phone className="w-3.5 h-3.5" />
            {isCalling ? "Dialing…" : "Initiate AI call"}
          </Button>
        </div>
      </div>

      {/* Profile header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Card>
          <CardBody className="p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start">
            <Avatar name={lead.name} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl text-foreground">{lead.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {lead.phone_number || "no phone"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> {lead.email || "no email"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Added{" "}
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <Badge variant={statusVariant(lead.status)}>{lead.status} PROSPECT</Badge>
                  <div className="border border-border bg-muted px-3 py-1.5 rounded-sm flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      Score
                    </span>
                    <span className="font-serif text-lg text-foreground">
                      <Ticker value={lead.lead_score} format="number" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Intelligence grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...spring.gentle, delay: 0.05 }}
          className="lg:col-span-1 space-y-5"
        >
          <Card>
            <CardBody className="p-6">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">
                Extracted data
              </h3>
              <div className="space-y-4">
                {[
                  { icon: Building, label: "Budget", value: lead.budget },
                  { icon: MapPin, label: "Location", value: lead.location_pref },
                  { icon: Flag, label: "Timeline", value: lead.timeline },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5 mb-1">
                      <d.icon className="w-3 h-3" /> {d.label}
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        d.value ? "text-foreground" : "text-muted-foreground italic",
                      )}
                    >
                      {d.value || "Not specified"}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {lead.action_items.length > 0 && (
            <Card className="border-accent/30">
              <CardBody className="p-6 bg-accent/[0.03]">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pending actions
                </h3>
                <ul className="space-y-3">
                  {lead.action_items.map((item) => (
                    <li
                      key={item.id}
                      className="bg-muted p-3 rounded-sm border border-border"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent mb-1">
                        {item.task_type.replace("_", " ")}
                      </div>
                      <div className="text-sm text-foreground">{item.description}</div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...spring.gentle, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="flex flex-col h-[600px]">
            <div className="flex items-center gap-1 px-2 py-2 border-b border-border">
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  activeTab === "overview"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                AI summaries
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={cn(
                  "px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                  activeTab === "timeline"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Raw transcripts
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "overview" ? (
                <div className="space-y-4">
                  {lead.sessions.length === 0 && (
                    <EmptyState
                      icon={<Phone className="w-8 h-8" />}
                      title="No call sessions yet"
                      description="When the voice agent qualifies this lead, summaries will appear here."
                    />
                  )}
                  {lead.sessions.map((session) => (
                    <div key={session.id} className="bg-muted p-5 rounded-sm border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                          {session.direction} call
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {new Date(session.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{session.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {lead.sessions.length === 0 && (
                    <EmptyState
                      icon={<Phone className="w-8 h-8" />}
                      title="No transcripts"
                      description="Call recordings will appear here once available."
                    />
                  )}
                  {lead.sessions.map((session, sIdx) => (
                    <div key={session.id} className="space-y-3">
                      <div className="sticky top-0 bg-card pt-2 pb-1 z-10 border-b border-border">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Session {sIdx + 1} · {new Date(session.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="space-y-2 font-urdu">
                        {session.transcript.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex flex-col max-w-[85%]",
                              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
                            )}
                          >
                            <div
                              className={cn(
                                "px-4 py-2 rounded-md text-base leading-relaxed",
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground border border-border",
                              )}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {showEditModal && (
        <LeadModal
          lead={lead}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchLead();
          }}
        />
      )}
    </div>
  );
}
