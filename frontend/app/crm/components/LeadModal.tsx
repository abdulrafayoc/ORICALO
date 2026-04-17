"use client";

import { useState } from "react";
import { X } from "lucide-react";

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
    
    // Convert necessary types
    const payload = {
        ...formData,
        phone_number: formData.phone_number || null,
        email: formData.email || null,
        budget: formData.budget || null,
        location_pref: formData.location_pref || null,
        timeline: formData.timeline || null,
    };

    const path = isEdit ? `http://127.0.0.1:8000/crm/leads/${lead.id}` : `http://127.0.0.1:8000/crm/leads`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(`Failed to save: ${error.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      alert("Error saving lead: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-neutral-800">
          <h3 className="text-xl font-bold text-white">{isEdit ? "Edit Prospect" : "New Prospect"}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Name</label>
              <input 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Phone Number</label>
              <input 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="+923001234567"
              />
            </div>
            
            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Status</label>
              <select 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="NEW">New</option>
                <option value="COLD">Cold</option>
                <option value="WARM">Warm</option>
                <option value="HOT">Hot</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Email Address</label>
              <input 
                type="email"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@example.com"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Budget</label>
              <input 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} placeholder="e.g. 5 Crore"
              />
            </div>
            
            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Location Preference</label>
              <input 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.location_pref} onChange={e => setFormData({ ...formData, location_pref: e.target.value })} placeholder="e.g. DHA Phase 5"
              />
            </div>
            
            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Lead Score (0-100)</label>
              <input 
                type="number" min="0" max="100"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.lead_score} onChange={e => setFormData({ ...formData, lead_score: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="col-span-1">
              <label className="block text-xs uppercase font-medium text-neutral-500 mb-1.5">Timeline</label>
              <input 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition-colors"
                value={formData.timeline} onChange={e => setFormData({ ...formData, timeline: e.target.value })} placeholder="e.g. Immediate"
              />
            </div>

            <div className="col-span-2 mt-2">
              <label className="flex items-center gap-3 p-3 border border-neutral-800 bg-neutral-950/50 rounded-lg cursor-pointer hover:bg-neutral-800/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.needs_human} 
                  onChange={e => setFormData({...formData, needs_human: e.target.checked})}
                  className="w-5 h-5 accent-orange-500 rounded border-neutral-700 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white text-sm">Requires Human Intervention</div>
                  <div className="text-xs text-neutral-500">Flag this lead to appear urgently on the Agent Action Queue</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg disabled:opacity-50">
              {saving ? "Saving..." : isEdit ? "Update Prospect" : "Create Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
