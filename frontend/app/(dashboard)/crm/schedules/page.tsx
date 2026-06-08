"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticker } from "@/components/Ticker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { spring, slideIn } from "@/lib/motion";

type VisitStatus = "scheduled" | "completed" | "cancelled" | "no_show";

interface PropertyVisit {
  id: number;
  lead_id: number;
  lead_name: string;
  property_address: string;
  scheduled_date: string;
  scheduled_time: string;
  status: VisitStatus;
  notes: string | null;
  agent: string;
}

const STATUS_BADGE: Record<VisitStatus, "neutral" | "mint" | "danger" | "warning"> = {
  scheduled: "neutral",
  completed: "mint",
  cancelled: "danger",
  no_show: "warning",
};

const STATUS_ICON: Record<VisitStatus, typeof Clock> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertCircle,
};

const FILTERS: { id: VisitStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function SchedulesPage() {
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<VisitStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<PropertyVisit | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setVisits([
        {
          id: 1,
          lead_id: 1,
          lead_name: "Ahmed Khan",
          property_address: "DHA Phase 5, House 12-A",
          scheduled_date: "2026-06-12",
          scheduled_time: "10:00 AM",
          status: "scheduled",
          notes: "Interested in 5 marla unit",
          agent: "Saima Iqbal",
        },
        {
          id: 2,
          lead_id: 2,
          lead_name: "Hassan Ali",
          property_address: "Bahria Town, Block A 22",
          scheduled_date: "2026-06-13",
          scheduled_time: "2:00 PM",
          status: "scheduled",
          notes: "Looking for family home",
          agent: "Faisal Khan",
        },
        {
          id: 3,
          lead_id: 3,
          lead_name: "Sara Mahmood",
          property_address: "Gulberg III, Commercial 8",
          scheduled_date: "2026-06-10",
          scheduled_time: "11:00 AM",
          status: "completed",
          notes: "Very interested, follow up required",
          agent: "Saima Iqbal",
        },
        {
          id: 4,
          lead_id: 4,
          lead_name: "Bilal Akhtar",
          property_address: "Model Town, Street 14",
          scheduled_date: "2026-06-09",
          scheduled_time: "3:00 PM",
          status: "cancelled",
          notes: "Rescheduled to next week",
          agent: "Faisal Khan",
        },
      ]);
      setLoading(false);
    }, 350);
  }, []);

  const filtered = visits.filter((v) => {
    const matchesStatus = filterStatus === "all" || v.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      v.lead_name.toLowerCase().includes(q) ||
      v.property_address.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const scheduledCount = visits.filter((v) => v.status === "scheduled").length;
  const completedCount = visits.filter((v) => v.status === "completed").length;
  const cancelledCount = visits.filter((v) => v.status === "cancelled").length;

  const handleScheduleVisit = () => {
    setSelectedVisit(null);
    setShowModal(true);
  };

  const handleEditVisit = (visit: PropertyVisit) => {
    setSelectedVisit(visit);
    setShowModal(true);
  };

  const handleCompleteVisit = (visit: PropertyVisit) => {
    setVisits(visits.map((v) => (v.id === visit.id ? { ...v, status: "completed" as const } : v)));
  };

  const handleCancelVisit = (visit: PropertyVisit) => {
    setVisits(visits.map((v) => (v.id === visit.id ? { ...v, status: "cancelled" as const } : v)));
  };

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            Property visits
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Schedule and manage property viewings.
          </p>
        </div>
        <Button onClick={handleScheduleVisit}>
          <Plus className="w-4 h-4" />
          Schedule visit
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Scheduled", count: scheduledCount, icon: Clock },
          { label: "Completed", count: completedCount, icon: CheckCircle2 },
          { label: "Cancelled", count: cancelledCount, icon: XCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardBody className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-sm bg-muted border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
                <div className="font-serif text-3xl text-foreground">
                  {loading ? "—" : <Ticker value={stat.count} format="number" />}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="max-w-md flex-1">
          <Input
            placeholder="search visits"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            mono
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors border",
                filterStatus === f.id
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visits */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-10 h-10" />}
          title="No visits found"
          description="Schedule your first property visit to get started."
          action={<Button onClick={handleScheduleVisit}>Schedule visit</Button>}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((visit) => {
              const Icon = STATUS_ICON[visit.status];
              return (
                <motion.div
                  key={visit.id}
                  layout
                  variants={slideIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={spring.gentle}
                >
                  <Card live>
                    <CardBody className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                              <h3 className="font-serif text-base text-foreground">
                                {visit.lead_name}
                              </h3>
                              <Badge variant={STATUS_BADGE[visit.status]}>
                                {visit.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{visit.property_address}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {visit.scheduled_date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {visit.scheduled_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {visit.agent}
                              </span>
                            </div>
                            {visit.notes && (
                              <div className="mt-2.5 text-sm text-muted-foreground bg-muted/40 border border-border rounded-sm p-2.5">
                                {visit.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 lg:ml-4">
                          <Button size="sm" variant="outline" onClick={() => handleEditVisit(visit)}>
                            Edit
                          </Button>
                          {visit.status === "scheduled" && (
                            <>
                              <Button size="sm" onClick={() => handleCompleteVisit(visit)}>
                                Complete
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleCancelVisit(visit)}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Dialog open onOpenChange={(open) => !open && setShowModal(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedVisit ? "Edit visit" : "Schedule visit"}
              </DialogTitle>
              <DialogDescription>
                Property viewings sync to the lead&apos;s timeline.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setShowModal(false);
              }}
            >
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Lead name
                </label>
                <Input defaultValue={selectedVisit?.lead_name || ""} placeholder="Lead name" />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Property address
                </label>
                <Input defaultValue={selectedVisit?.property_address || ""} placeholder="DHA Phase 5, House 12-A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Date
                  </label>
                  <Input type="date" defaultValue={selectedVisit?.scheduled_date || ""} mono />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Time
                  </label>
                  <Input type="time" defaultValue={selectedVisit?.scheduled_time || ""} mono />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Agent
                </label>
                <Input defaultValue={selectedVisit?.agent || ""} placeholder="Assigned agent" />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Notes
                </label>
                <Textarea defaultValue={selectedVisit?.notes || ""} placeholder="Any context…" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">{selectedVisit ? "Update" : "Schedule"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
