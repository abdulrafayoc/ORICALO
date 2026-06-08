"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar as CalendarIcon,
  Video,
  ArrowRight,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { calendarApi, Meeting } from "@/lib/calendar-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Ticker } from "@/components/Ticker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPKR } from "@/lib/format";
import { spring, slideIn } from "@/lib/motion";

type Stage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

interface PipelineLead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  stage: Stage;
  value: number;
  location: string | null;
  last_activity: string;
  probability: number;
}

const STAGES: { id: Stage; name: string; tone: "neutral" | "mint" | "warning" | "danger" }[] = [
  { id: "new", name: "New", tone: "neutral" },
  { id: "contacted", name: "Contacted", tone: "neutral" },
  { id: "qualified", name: "Qualified", tone: "mint" },
  { id: "proposal", name: "Proposal", tone: "mint" },
  { id: "negotiation", name: "Negotiation", tone: "warning" },
  { id: "closed_won", name: "Won", tone: "mint" },
  { id: "closed_lost", name: "Lost", tone: "danger" },
];

function PipelineCard({
  lead,
  onSchedule,
}: {
  lead: PipelineLead;
  onSchedule: () => void;
}) {
  return (
    <motion.div
      layout
      layoutId={`pipeline-${lead.id}`}
      variants={slideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={spring.gentle}
    >
      <Card live className="cursor-default">
        <CardBody className="p-3.5 space-y-3">
          <div className="flex items-start gap-2.5">
            <Avatar name={lead.name} size="sm" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/crm/${lead.id}`}
                className="text-sm text-foreground hover:text-accent transition-colors truncate block"
              >
                {lead.name}
              </Link>
              <div className="font-mono text-[10px] text-muted-foreground truncate">
                {lead.phone}
              </div>
            </div>
          </div>

          {lead.value > 0 && (
            <div className="font-serif text-lg text-foreground">
              {formatPKR(lead.value)}
            </div>
          )}

          {lead.location && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{lead.location}</span>
            </div>
          )}

          {/* Probability */}
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>Probability</span>
              <span
                className={
                  lead.probability >= 70 ? "text-accent" : "text-muted-foreground"
                }
              >
                {lead.probability}%
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  lead.probability >= 70
                    ? "bg-accent"
                    : lead.probability >= 40
                      ? "bg-yellow-500"
                      : "bg-muted-foreground",
                )}
                style={{ width: `${lead.probability}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              {lead.last_activity}
            </span>
            <button
              onClick={onSchedule}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
              aria-label="Schedule meeting"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function StageColumn({
  stage,
  leads,
  onSchedule,
}: {
  stage: (typeof STAGES)[number];
  leads: PipelineLead[];
  onSchedule: (l: PipelineLead) => void;
}) {
  const total = leads.reduce((s, l) => s + l.value, 0);
  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-card border border-border rounded-md max-h-[calc(100vh-22rem)]">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant={stage.tone}>{stage.name}</Badge>
          <span className="font-mono text-[10px] text-muted-foreground">
            ·{leads.length}
          </span>
        </div>
        {total > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">
            {formatPKR(total)}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {leads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-10 text-center"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60">
                no leads
              </span>
            </motion.div>
          ) : (
            leads.map((lead) => (
              <PipelineCard
                key={lead.id}
                lead={lead}
                onSchedule={() => onSchedule(lead)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/crm/leads")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setLeads([]);
          setLoading(false);
          return;
        }
        const transformed: PipelineLead[] = data.map((lead: Record<string, unknown>) => ({
          id: lead.id as number,
          name: (lead.name as string) || "Unknown",
          phone: (lead.phone_number as string) || "no phone",
          email: (lead.email as string | null) ?? null,
          stage: ((lead.status as string)?.toLowerCase() as Stage) || "new",
          value: lead.budget
            ? parseInt(String(lead.budget).replace(/[^0-9]/g, "")) || 0
            : 0,
          location: (lead.location_pref as string | null) ?? null,
          last_activity: (lead.updated_at as string)?.split("T")[0] || "—",
          probability: (lead.lead_score as number) || 0,
        }));
        setLeads(transformed);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    calendarApi
      .getMeetings({ status: "SCHEDULED" })
      .then(setMeetings)
      .catch(() => setMeetings([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.location || "").toLowerCase().includes(q),
    );
  }, [leads, search]);

  const totalValue = leads.reduce((s, l) => s + l.value, 0);
  const weightedValue = leads.reduce(
    (s, l) => s + (l.value * l.probability) / 100,
    0,
  );
  const activeDeals = leads.filter(
    (l) => l.stage !== "closed_won" && l.stage !== "closed_lost",
  ).length;

  const handleSchedule = (lead: PipelineLead) => {
    setSelectedLead(lead);
    setShowScheduleModal(true);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            Sales pipeline
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track leads through your sales process.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowCalendarView(true)}>
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </Button>
          <Button>
            <Plus className="w-4 h-4" />
            Add lead
          </Button>
        </div>
      </header>

      {/* Pipeline stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Total pipeline value
              </div>
            </div>
            <div className="font-serif text-3xl text-foreground">
              {loading ? "—" : <Ticker value={totalValue} format="pkr" />}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Weighted pipeline
              </div>
            </div>
            <div className="font-serif text-3xl text-foreground">
              {loading ? "—" : <Ticker value={weightedValue} format="pkr" />}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-sm bg-muted border border-border flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Active deals
              </div>
            </div>
            <div className="font-serif text-3xl text-foreground">
              {loading ? "—" : <Ticker value={activeDeals} format="number" />}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="search leads"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          mono
        />
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((s) => (
            <div key={s.id} className="w-[280px] shrink-0 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={filtered.filter((l) => l.stage === stage.id)}
              onSchedule={handleSchedule}
            />
          ))}
        </div>
      )}

      {/* Schedule meeting modal */}
      {showScheduleModal && selectedLead && (
        <ScheduleMeetingModal
          lead={selectedLead}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(m) => {
            setMeetings((prev) => [...prev, m]);
            setShowScheduleModal(false);
          }}
        />
      )}

      {/* Calendar view modal */}
      {showCalendarView && (
        <CalendarViewModal
          meetings={meetings}
          onClose={() => setShowCalendarView(false)}
        />
      )}
    </div>
  );
}

/* ─── Schedule modal ──────────────────────────────────────────── */

function ScheduleMeetingModal({
  lead,
  onClose,
  onScheduled,
}: {
  lead: PipelineLead;
  onClose: () => void;
  onScheduled: (m: Meeting) => void;
}) {
  const [meetingType, setMeetingType] = useState<"VISIT" | "CALL" | "VIDEO">("VISIT");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const m = await calendarApi.bookMeeting({
        lead_id: lead.id,
        meeting_type: meetingType,
        scheduled_date: date || new Date().toISOString().split("T")[0],
        scheduled_time: time || "12:00",
        duration_minutes: 60,
        notes,
      });
      onScheduled(m);
    } catch (err) {
      console.error("Failed to book meeting:", err);
      alert("Failed to book meeting. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule meeting</DialogTitle>
          <DialogDescription>
            With <span className="text-foreground">{lead.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
              Meeting type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "VISIT" as const, icon: MapPin, label: "Visit" },
                { id: "CALL" as const, icon: Phone, label: "Call" },
                { id: "VIDEO" as const, icon: Video, label: "Video" },
              ].map((t) => {
                const Icon = t.icon;
                const active = meetingType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMeetingType(t.id)}
                    className={cn(
                      "p-3 rounded-sm border transition-colors flex flex-col items-center gap-1.5",
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                mono
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                mono
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for this meeting…"
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Calendar view modal ─────────────────────────────────────── */

function CalendarViewModal({
  meetings,
  onClose,
}: {
  meetings: Meeting[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scheduled meetings</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              {meetings.length} upcoming
            </span>
          </DialogDescription>
        </DialogHeader>

        {meetings.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-10 h-10" />}
            title="No scheduled meetings"
            description="Book a meeting from any pipeline card to start filling your calendar."
          />
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const Icon =
                meeting.meeting_type === "VISIT"
                  ? MapPin
                  : meeting.meeting_type === "CALL"
                    ? Phone
                    : Video;
              return (
                <Card key={meeting.id} live>
                  <CardBody className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-base text-foreground">
                          {meeting.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {meeting.lead_name}
                        </div>
                        <div className="flex items-center gap-4 mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {meeting.scheduled_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meeting.scheduled_time}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/crm`}
                        className="p-2 rounded-sm text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                        aria-label="Open lead"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
