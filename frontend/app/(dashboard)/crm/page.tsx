"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Filter, ArrowRight, UserCircle2, Phone, Briefcase, Zap, AlertCircle, Plus, Calendar, CheckSquare, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LeadModal } from "./components/LeadModal";
import { apiFetch } from "@/lib/api";

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

export default function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = () => {
    apiFetch("/crm/leads")
      .then(res => res.json())
      .then(data => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch leads", err);
        setLeads([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HOT":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold">HOT</span>;
      case "WARM":
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-lg text-xs font-semibold">WARM</span>;
      case "COLD":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg text-xs font-semibold">COLD</span>;
      case "CLOSED":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs font-semibold">CLOSED</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold">NEW</span>;
    }
  };

  const hotCount = Array.isArray(leads) ? leads.filter(l => l.status === "HOT").length : 0;
  const requireHumanCount = Array.isArray(leads) ? leads.filter(l => l.needs_human).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Lead Intelligence</h1>
          <p className="text-slate-400 mt-1">Manage voice AI prospects and follow-ups</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16"/></div>
          <div className="text-slate-400 text-sm font-medium">Total Leads</div>
          <div className="text-4xl font-bold text-white mt-2">{loading ? "-" : leads.length}</div>
        </div>
        
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-red-500 opacity-10"><Zap className="w-16 h-16"/></div>
          <div className="text-slate-400 text-sm font-medium">Hot Prospects</div>
          <div className="text-4xl font-bold text-red-400 mt-2">{loading ? "-" : hotCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-orange-500 opacity-10"><AlertCircle className="w-16 h-16"/></div>
          <div className="text-slate-400 text-sm font-medium">Needs Human Follow-up</div>
          <div className="text-4xl font-bold text-orange-400 mt-2">{loading ? "-" : requireHumanCount}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/crm/schedules" className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/70 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">Property Visits</div>
              <div className="text-xs text-slate-500">Schedule & manage viewings</div>
            </div>
          </div>
        </Link>

        <Link href="/crm/follow-ups" className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/70 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">Follow-ups</div>
              <div className="text-xs text-slate-500">Track pending actions</div>
            </div>
          </div>
        </Link>

        <Link href="/crm/pipeline" className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/70 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">Pipeline</div>
              <div className="text-xs text-slate-500">View sales pipeline</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Prospects Roster</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition border border-slate-700">
              <Filter className="w-4 h-4"/> Filter
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Lead</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Pref Location</th>
                <th className="px-6 py-4 font-medium">Budget</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-2 bg-slate-800 rounded w-16"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-800 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Phone className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No leads have been generated yet.<br/>
                    Start a voice call to capture your first prospect!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-medium">
                          {lead.name === "Unknown Caller" ? <UserCircle2 className="w-5 h-5 opacity-70"/> : lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{lead.name}</div>
                          <div className="text-xs mt-0.5 opacity-70">{lead.phone_number || "No Phone Captured"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(lead.status)}
                        {lead.needs_human && (
                          <span className="text-[10px] text-orange-400 font-medium">Target 🎯</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 truncate max-w-[200px]">{lead.location_pref || "—"}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{lead.budget || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", lead.lead_score >= 70 ? "text-emerald-400" : "text-slate-400")}>{lead.lead_score}</span>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full max-w-[60px] overflow-hidden">
                          <div className={cn("h-full", lead.lead_score >= 70 ? "bg-emerald-500" : "bg-slate-500")} style={{width: `${lead.lead_score}%`}}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/crm/${lead.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition group-hover:bg-slate-700/50">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
  )
}
