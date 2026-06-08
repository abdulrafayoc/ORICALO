"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Lead {
  id?: number;
  name: string;
  phone_number: string;
  email: string | null;
  status: string;
  needs_human: boolean;
  budget: string | null;
  location_pref: string | null;
  timeline: string | null;
  lead_score: number;
}

interface LeadModalProps {
  lead?: Lead | null;
  onClose: () => void;
  onSave: () => void;
}

const FIELD_LABEL =
  "block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2";

export function LeadModal({ lead, onClose, onSave }: LeadModalProps) {
  const isEdit = !!lead;

  const [formData, setFormData] = useState({
    name: lead?.name || "",
    phone_number: lead?.phone_number || "",
    email: lead?.email || "",
    status: lead?.status || "NEW",
    needs_human: lead?.needs_human || false,
    budget: lead?.budget || "",
    location_pref: lead?.location_pref || "",
    timeline: lead?.timeline || "",
    lead_score: lead?.lead_score || 0,
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...formData,
      phone_number: formData.phone_number || null,
      email: formData.email || null,
      budget: formData.budget || null,
      location_pref: formData.location_pref || null,
      timeline: formData.timeline || null,
    };

    const path = isEdit ? `/crm/leads/${lead!.id}` : `/crm/leads`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(`Failed to save: ${error.detail || "Unknown error"}`);
      }
    } catch (err: unknown) {
      alert("Error saving lead: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit prospect" : "New prospect"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the lead's qualification details."
              : "Capture a new prospect manually."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className={FIELD_LABEL}>
                Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className={FIELD_LABEL}>
                Phone
              </label>
              <Input
                id="phone"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder="+92 300 1234567"
              />
            </div>

            <div>
              <label htmlFor="status" className={FIELD_LABEL}>
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-colors"
              >
                <option value="NEW">New</option>
                <option value="COLD">Cold</option>
                <option value="WARM">Warm</option>
                <option value="HOT">Hot</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="email" className={FIELD_LABEL}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label htmlFor="budget" className={FIELD_LABEL}>
                Budget
              </label>
              <Input
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g. 5 crore"
              />
            </div>

            <div>
              <label htmlFor="location" className={FIELD_LABEL}>
                Location
              </label>
              <Input
                id="location"
                value={formData.location_pref}
                onChange={(e) =>
                  setFormData({ ...formData, location_pref: e.target.value })
                }
                placeholder="e.g. DHA Phase 5"
              />
            </div>

            <div>
              <label htmlFor="score" className={FIELD_LABEL}>
                Lead score (0–100)
              </label>
              <Input
                id="score"
                type="number"
                min={0}
                max={100}
                value={formData.lead_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lead_score: parseInt(e.target.value) || 0,
                  })
                }
                mono
              />
            </div>

            <div>
              <label htmlFor="timeline" className={FIELD_LABEL}>
                Timeline
              </label>
              <Input
                id="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="e.g. immediate"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 border border-border bg-muted/40 rounded-md cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={formData.needs_human}
              onChange={(e) => setFormData({ ...formData, needs_human: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded-sm border-border bg-input text-accent focus:ring-1 focus:ring-ring"
            />
            <div>
              <div className="text-sm text-foreground">Requires human intervention</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                Flag for the agent action queue
              </div>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-5 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update prospect" : "Create prospect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
