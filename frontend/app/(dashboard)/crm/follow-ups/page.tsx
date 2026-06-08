"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  User,
  Phone,
  Mail,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  MessageSquare,
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

type Status = "pending" | "completed" | "overdue";
type Priority = "low" | "medium" | "high";
type FollowType = "call" | "email" | "meeting" | "task";

interface FollowUp {
  id: number;
  lead_id: number;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  type: FollowType;
  subject: string;
  due_date: string;
  due_time: string;
  status: Status;
  priority: Priority;
  notes: string | null;
  assigned_to: string;
}

const STATUS_BADGE: Record<Status, "neutral" | "mint" | "danger"> = {
  pending: "neutral",
  completed: "mint",
  overdue: "danger",
};
const PRIORITY_BADGE: Record<Priority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

const TYPE_ICON: Record<FollowType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setFollowUps([
        {
          id: 1,
          lead_id: 1,
          lead_name: "Ahmed Khan",
          lead_phone: "+92 300 1234567",
          lead_email: "ahmed.khan@email.com",
          type: "call",
          subject: "Follow up on property interest",
          due_date: "2026-06-12",
          due_time: "10:00 AM",
          status: "pending",
          priority: "high",
          notes: "Interested in DHA Phase 5 listing",
          assigned_to: "Saima Iqbal",
        },
        {
          id: 2,
          lead_id: 2,
          lead_name: "Hassan Ali",
          lead_phone: "+92 301 2345678",
          lead_email: "hassan.ali@email.com",
          type: "email",
          subject: "Send property brochure",
          due_date: "2026-06-13",
          due_time: "2:00 PM",
          status: "pending",
          priority: "medium",
          notes: "Request for detailed information",
          assigned_to: "Faisal Khan",
        },
        {
          id: 3,
          lead_id: 3,
          lead_name: "Sara Mahmood",
          lead_phone: "+92 302 3456789",
          lead_email: "sara.mahmood@email.com",
          type: "meeting",
          subject: "Property viewing appointment",
          due_date: "2026-06-09",
          due_time: "3:00 PM",
          status: "overdue",
          priority: "high",
          notes: "Reschedule required",
          assigned_to: "Saima Iqbal",
        },
        {
          id: 4,
          lead_id: 4,
          lead_name: "Bilal Akhtar",
          lead_phone: "+92 303 4567890",
          lead_email: null,
          type: "task",
          subject: "Update lead information",
          due_date: "2026-06-08",
          due_time: "11:00 AM",
          status: "completed",
          priority: "low",
          notes: "Updated budget preferences",
          assigned_to: "Faisal Khan",
        },
        {
          id: 5,
          lead_id: 5,
          lead_name: "Zainab Tariq",
          lead_phone: "+92 304 5678901",
          lead_email: "zainab.tariq@email.com",
          type: "call",
          subject: "Discuss financing options",
          due_date: "2026-06-14",
          due_time: "4:00 PM",
          status: "pending",
          priority: "medium",
          notes: "Pre-approved for mortgage",
          assigned_to: "Saima Iqbal",
        },
      ]);
      setLoading(false);
    }, 350);
  }, []);

  const filtered = followUps.filter((f) => {
    const matchesStatus = filterStatus === "all" || f.status === filterStatus;
    const matchesPriority = filterPriority === "all" || f.priority === filterPriority;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      f.lead_name.toLowerCase().includes(q) ||
      f.subject.toLowerCase().includes(q);
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const pendingCount = followUps.filter((f) => f.status === "pending").length;
  const overdueCount = followUps.filter((f) => f.status === "overdue").length;
  const completedCount = followUps.filter((f) => f.status === "completed").length;
  const highPriorityCount = followUps.filter(
    (f) => f.priority === "high" && f.status !== "completed",
  ).length;

  const handleAdd = () => {
    setSelectedFollowUp(null);
    setShowModal(true);
  };
  const handleEdit = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowModal(true);
  };
  const handleComplete = (followUp: FollowUp) => {
    setFollowUps(
      followUps.map((f) => (f.id === followUp.id ? { ...f, status: "completed" as const } : f)),
    );
  };

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            Follow-ups
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track and manage pending actions across your lead pipeline.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          Add follow-up
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: pendingCount, icon: Clock },
          { label: "Overdue", count: overdueCount, icon: AlertCircle, danger: true },
          { label: "Completed", count: completedCount, icon: CheckCircle2 },
          { label: "High priority", count: highPriorityCount, icon: AlertCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardBody className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      stat.danger ? "text-destructive" : "text-muted-foreground",
                    )}
                  />
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
                <div
                  className={cn(
                    "font-serif text-3xl",
                    stat.danger ? "text-destructive" : "text-foreground",
                  )}
                >
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
            placeholder="search follow-ups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            mono
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | "all")}
            className="h-9 bg-input border border-border rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
            className="h-9 bg-input border border-border rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Follow-ups */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-10 h-10" />}
          title="No follow-ups found"
          description="Create your first follow-up to start tracking actions."
          action={<Button onClick={handleAdd}>Add follow-up</Button>}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((followUp) => {
              const Icon = TYPE_ICON[followUp.type];
              return (
                <motion.div
                  key={followUp.id}
                  layout
                  variants={slideIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={spring.gentle}
                >
                  <Card
                    live
                    className={cn(followUp.status === "overdue" && "border-destructive/40")}
                  >
                    <CardBody className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h3 className="font-serif text-base text-foreground">
                                {followUp.subject}
                              </h3>
                              <Badge variant={STATUS_BADGE[followUp.status]}>
                                {followUp.status}
                              </Badge>
                              <Badge variant={PRIORITY_BADGE[followUp.priority]}>
                                {followUp.priority}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {followUp.lead_name}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {followUp.lead_phone}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {followUp.due_date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {followUp.due_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {followUp.assigned_to}
                              </span>
                            </div>
                            {followUp.notes && (
                              <div className="mt-2.5 text-sm text-muted-foreground bg-muted/40 border border-border rounded-sm p-2.5">
                                {followUp.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 lg:ml-4">
                          {followUp.status !== "completed" && (
                            <Button size="sm" onClick={() => handleComplete(followUp)}>
                              Complete
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEdit(followUp)}>
                            Edit
                          </Button>
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
                {selectedFollowUp ? "Edit follow-up" : "Add follow-up"}
              </DialogTitle>
              <DialogDescription>
                Follow-ups sync with the lead&apos;s action queue.
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
                <Input defaultValue={selectedFollowUp?.lead_name || ""} />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Subject
                </label>
                <Input defaultValue={selectedFollowUp?.subject || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Type
                  </label>
                  <select
                    defaultValue={selectedFollowUp?.type || "call"}
                    className="h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Priority
                  </label>
                  <select
                    defaultValue={selectedFollowUp?.priority || "medium"}
                    className="h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Due date
                  </label>
                  <Input type="date" defaultValue={selectedFollowUp?.due_date || ""} mono />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Due time
                  </label>
                  <Input type="time" defaultValue={selectedFollowUp?.due_time || ""} mono />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Assigned to
                </label>
                <Input defaultValue={selectedFollowUp?.assigned_to || ""} />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Notes
                </label>
                <Textarea defaultValue={selectedFollowUp?.notes || ""} placeholder="Any context…" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">{selectedFollowUp ? "Update" : "Add"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
