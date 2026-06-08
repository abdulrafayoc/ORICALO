"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Check,
  Phone,
  ArrowUpRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { spring, slideIn } from "@/lib/motion";

interface Lead {
  id: number;
  name: string;
  phone_number: string;
}

interface ActionItem {
  id: number;
  task_type: string;
  description: string;
  status: string;
  created_at: string;
  lead: Lead;
}

export default function CRMTasks() {
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await apiFetch("/crm/action_items");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async (taskId: number) => {
    setCompletingId(taskId);
    try {
      const res = await apiFetch(`/crm/action_items/${taskId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setCompletingId(null);
        }, 450);
      } else {
        setCompletingId(null);
      }
    } catch (err) {
      console.error(err);
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl text-foreground tracking-tight flex items-center gap-3">
          <CheckSquare className="w-7 h-7 text-accent" />
          Agent action queue
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage follow-ups and human-intervention requests flagged by the AI.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Check className="w-10 h-10 text-accent" />}
          title="Inbox zero"
          description="There are no pending actions. The AI has handled everything so far."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                variants={slideIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={spring.gentle}
              >
                <Card
                  className={cn(
                    "relative overflow-hidden",
                    completingId === task.id && "border-accent ring-1 ring-accent/40",
                  )}
                >
                  <CardBody className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="warning" className="flex items-center gap-1.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {task.task_type.replace("_", " ")}
                      </Badge>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <Link
                        href={`/crm/${task.lead.id}`}
                        className="font-serif text-lg text-foreground hover:text-accent transition-colors flex items-center gap-1 group"
                      >
                        {task.lead.name}
                        <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3" />
                        {task.lead.phone_number || "no phone"}
                      </div>
                    </div>

                    <div className="bg-muted/40 border border-border rounded-sm p-3">
                      <p className="text-sm text-foreground leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingId === task.id}
                      className="w-full"
                      variant={completingId === task.id ? "primary" : "outline"}
                    >
                      {completingId === task.id ? (
                        <>Marking complete…</>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Mark as done
                        </>
                      )}
                    </Button>

                    <AnimatePresence>
                      {completingId === task.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-accent/10 backdrop-blur-[1px] z-10 flex items-center justify-center"
                        >
                          <Check className="w-12 h-12 text-accent drop-shadow-lg" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
