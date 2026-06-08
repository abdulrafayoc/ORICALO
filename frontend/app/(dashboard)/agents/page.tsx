"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { spring, slideIn } from "@/lib/motion";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/agents/")
      .then((res) => res.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch((err) => console.error("Failed to fetch agents", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteAgent = async (agentId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      const response = await apiFetch(`/agents/${agentId}`, { method: "DELETE" });
      if (response.ok) {
        setAgents(agents.filter((agent) => agent.id !== agentId));
      } else {
        throw new Error("Failed to delete agent");
      }
    } catch (err) {
      console.error("Error deleting agent:", err);
      alert("Failed to delete agent. Please try again.");
    }
  };

  const filtered = search
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : agents;

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">AI agents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your AI personas and configurations.
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="w-4 h-4" />
            New agent
          </Button>
        </Link>
      </header>

      <div className="max-w-md">
        <Input
          placeholder="search agents"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          mono
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-10 h-10" />}
          title="No agents yet"
          description="Create your first AI persona to start handling inbound calls."
          action={
            <Link href="/agents/new">
              <Button>Create agent</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence initial={false}>
            {filtered.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                variants={slideIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={spring.gentle}
              >
                <Link href={`/agents/${agent.id}`} className="group block h-full">
                  <Card live className="h-full">
                    <CardBody className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-sm border border-accent/40 bg-background flex items-center justify-center font-serif text-accent">
                          AI
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusDot
                            state={agent.is_active ? "live" : "idle"}
                            size="xs"
                          />
                          <Badge variant={agent.is_active ? "mint" : "neutral"}>
                            {agent.is_active ? "Active" : "Idle"}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors mb-2">
                        {agent.name || "Untitled agent"}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-5 flex-1">
                        {agent.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {agent.slug || "—"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteAgent(agent.id, e)}
                            className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Create-new card */}
          <Link href="/agents/new" className="group block h-full">
            <div className="h-full min-h-[180px] border-2 border-dashed border-border rounded-md p-6 hover:bg-card hover:border-accent/40 transition-colors flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-accent">
              <div className="w-10 h-10 rounded-sm bg-muted border border-border flex items-center justify-center group-hover:border-accent/40 group-hover:bg-accent/10 transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                Create new agent
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
