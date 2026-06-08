"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

const DEFAULT_AGENT: Agent = {
  id: 0,
  name: "",
  slug: "",
  description: "",
  system_prompt: "",
  is_active: true,
};

const FIELD_LABEL =
  "block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2";

export default function AgentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === "new";
  const [agent, setAgent] = useState<Agent>(DEFAULT_AGENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      apiFetch(`/agents/${resolvedParams.id}`)
        .then((res) => res.json())
        .then(setAgent)
        .catch((err) => console.error(err));
    }
  }, [isNew, resolvedParams.id]);

  const handleSave = async () => {
    setSaving(true);
    const path = isNew ? "/agents/" : `/agents/${agent.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(agent),
      });
      router.push("/agents");
    } catch {
      alert("Error saving agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-sm hover:bg-muted"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl text-foreground">
              {isNew ? "New agent" : agent.name || "Untitled agent"}
            </h1>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
              {isNew ? "Draft · unsaved" : agent.slug || "—"}
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save configuration
            </>
          )}
        </Button>
      </div>

      {/* Split view */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left: settings */}
        <div className="col-span-12 lg:col-span-4 space-y-5 overflow-y-auto pr-1">
          <Card>
            <CardBody className="p-5 space-y-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                General information
              </div>

              <div>
                <label htmlFor="name" className={FIELD_LABEL}>
                  Display name
                </label>
                <Input
                  id="name"
                  placeholder="Agent name"
                  value={agent.name}
                  onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="slug" className={FIELD_LABEL}>
                  Slug (ID)
                </label>
                <Input
                  id="slug"
                  placeholder="unique-id"
                  value={agent.slug}
                  onChange={(e) => setAgent({ ...agent, slug: e.target.value })}
                  mono
                />
              </div>

              <div>
                <label htmlFor="description" className={FIELD_LABEL}>
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe what this agent does…"
                  value={agent.description || ""}
                  onChange={(e) =>
                    setAgent({ ...agent, description: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>

              <label className="flex items-start gap-3 p-3 border border-border bg-muted/40 rounded-md cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  id="active"
                  checked={agent.is_active}
                  onChange={(e) =>
                    setAgent({ ...agent, is_active: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 rounded-sm border-border bg-input text-accent focus:ring-1 focus:ring-ring"
                />
                <div>
                  <div className="text-sm text-foreground">
                    Active / deployable
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                    Toggle to enable this persona for incoming calls
                  </div>
                </div>
              </label>
            </CardBody>
          </Card>
        </div>

        {/* Right: prompt editor */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full bg-card border border-border rounded-md overflow-hidden">
          <div className="bg-popover border-b border-border px-4 py-2.5 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground">
              system_instruction.md
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Editor
            </span>
          </div>
          <textarea
            className="flex-1 w-full bg-card p-5 font-mono text-sm text-foreground focus:outline-none resize-none leading-relaxed placeholder:text-muted-foreground"
            placeholder="Define the agent's persona and constraints here…"
            value={agent.system_prompt}
            onChange={(e) =>
              setAgent({ ...agent, system_prompt: e.target.value })
            }
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
