"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Filter, ArrowRight, UserCircle2, Phone, Briefcase, Zap, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LeadModal } from "./components/LeadModal";

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
    fetch("http://127.0.0.1:8000/crm/leads")
      .then(res => res.json())
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch leads", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HOT":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs font-semibold">HOT</span>;
      case "WARM":
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-xs font-semibold">WARM</span>;
      case "COLD":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs font-semibold">COLD</span>;
      case "CLOSED":
        return <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs font-semibold">CLOSED</span>;
      default:
        return <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-1 rounded text-xs font-semibold">NEW</span>;
    }
  };

  const hotCount = leads.filter(l => l.status === "HOT").length;
  const requireHumanCount = leads.filter(l => l.needs_human).length;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Metrics */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-neutral-400" />
              Lead Intelligence
            </h1>
            <p className="text-neutral-400 mt-2">Manage voice AI prospects and follow-ups securely.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16"/></div>
            <div className="text-neutral-400 text-sm font-medium">Total Leads</div>
            <div className="text-4xl font-bold text-white mt-2">{loading ? "-" : leads.length}</div>
          </motion.div>
          
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-red-500 opacity-10"><Zap className="w-16 h-16"/></div>
            <div className="text-neutral-400 text-sm font-medium">Hot Prospects</div>
            <div className="text-4xl font-bold text-red-400 mt-2">{loading ? "-" : hotCount}</div>
          </motion.div>

          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-orange-500 opacity-10"><AlertCircle className="w-16 h-16"/></div>
            <div className="text-neutral-400 text-sm font-medium">Needs Human Follow-up</div>
            <div className="text-4xl font-bold text-orange-400 mt-2">{loading ? "-" : requireHumanCount}</div>
          </motion.div>
        </div>

        {/* Master Table */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
            <h2 className="text-lg font-medium text-white">Prospects Roster</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-md transition border border-neutral-700">
                <Filter className="w-4 h-4"/> Filter
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition shadow-md">
                <Plus className="w-4 h-4"/> Add Prospect
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="bg-neutral-950/50 text-neutral-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Lead</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Pref Location</th>
                  <th className="px-6 py-4 font-medium">Budget</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {loading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-neutral-800 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-2 bg-neutral-800 rounded w-16"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-neutral-800 rounded w-8 ml-auto"></div></td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      <Phone className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      No leads have been generated yet.<br/>
                      Start a voice call to capture your first prospect!
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-neutral-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-medium">
                            {lead.name === "Unknown Caller" ? <UserCircle2 className="w-5 h-5 opacity-70"/> : lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-neutral-200">{lead.name}</div>
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
                      <td className="px-6 py-4 font-mono text-neutral-300">{lead.budget || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", lead.lead_score >= 70 ? "text-green-400" : "text-neutral-400")}>{lead.lead_score}</span>
                          <div className="w-full h-1.5 bg-neutral-800 rounded-full max-w-[60px] overflow-hidden">
                            <div className={cn("h-full", lead.lead_score >= 70 ? "bg-green-500" : "bg-neutral-500")} style={{width: `${lead.lead_score}%`}}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/crm/${lead.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition group-hover:bg-neutral-700/50">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

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
    </div>
  )
}
