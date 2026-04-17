"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, UserCircle2, Phone, Mail, Calendar, MapPin, Building, Flag, CheckCircle2, Trash2, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LeadModal } from "../components/LeadModal";
import { useRouter } from "next/navigation";

interface ActionItem {
  id: number;
  task_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface CallSession {
  id: string;
  direction: string;
  transcript: { role: string; text: string }[];
  summary: string;
  duration_seconds: number;
  created_at: string;
}

interface LeadDetail {
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
  created_at: string;
  sessions: CallSession[];
  action_items: ActionItem[];
}

export default function LeadProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");

  const [isCalling, setIsCalling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLead = () => {
    fetch(`http://127.0.0.1:8000/crm/leads/${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setLead(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch lead", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLead();
  }, [resolvedParams.id]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;
  }

  if (!lead) {
    return <div className="flex-1 p-8 text-center text-neutral-500">Lead not found.</div>;
  }

  const getStatusColor = (status: string) => {
    if (status === "HOT") return "text-red-400 bg-red-400/10 border-red-500/20";
    if (status === "WARM") return "text-orange-400 bg-orange-400/10 border-orange-500/20";
    if (status === "CLOSED") return "text-green-400 bg-green-400/10 border-green-500/20";
    return "text-blue-400 bg-blue-400/10 border-blue-500/20";
  };

  const handleOutboundCall = async () => {
    if (!lead?.phone_number) return alert("No phone number available");
    
    // In production, you'd auto-resolve your ngrok URL via an env variable. 
    // Here we'll prompt the user so it works dynamically if their ngrok domain changes.
    const pubUrl = prompt("Enter your public domain (e.g., my-ngrok.io) for the Twilio webhook:");
    if (!pubUrl) return;

    setIsCalling(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/crm/leads/${lead.id}/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_url: pubUrl })
      });
      const data = await res.json();
      if (!res.ok) alert("Error initiating call: " + (data.detail || JSON.stringify(data)));
      else alert("Call initiated! Call SID: " + data.call_sid);
    } catch (e: any) {
      alert("Failed to initiate call: " + e.message);
    }
    setIsCalling(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this lead? All call transcripts will be destroyed.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/crm/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) router.push("/crm");
      else alert("Failed to delete lead");
    } catch (e: any) {
      alert("Error deleting lead: " + e.message);
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link href="/crm" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Prospects
          </Link>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowEditModal(true)} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 shadow-lg">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-500/20 shadow-lg">
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button 
              onClick={handleOutboundCall} 
              disabled={isCalling || !lead.phone_number}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition shadow-lg", 
                isCalling || !lead.phone_number ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
              )}>
              <Phone className="w-4 h-4" />
              {isCalling ? "Dialing..." : "Initiate AI Call"}
            </button>
          </div>
        </div>

        {/* Profile Header Block */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border-2 border-neutral-800 shadow-xl flex items-center justify-center text-4xl text-neutral-300">
              {lead.name === "Unknown Caller" ? <UserCircle2 className="w-12 h-12 opacity-50"/> : lead.name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{lead.name}</h1>
                <div className="flex items-center gap-4 mt-3 text-sm text-neutral-400">
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4"/> {lead.phone_number || "No Phone"}</span>
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4"/> {lead.email || "No Email"}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Added {new Date(lead.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 text-right">
                <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", getStatusColor(lead.status))}>
                  {lead.status} PROSPECT
                </span>
                <div className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <span className="text-xs text-neutral-500 uppercase font-semibold tracking-wider">Score</span>
                  <span className="text-lg font-bold text-white">{lead.lead_score}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="lg:col-span-1 space-y-6">
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Extracted Data</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 mb-1"><Building className="w-3.5 h-3.5"/> Budget</div>
                  <div className="font-medium text-neutral-200">{lead.budget || "Not Specified"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5"/> Location</div>
                  <div className="font-medium text-neutral-200">{lead.location_pref || "Not Specified"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 mb-1"><Flag className="w-3.5 h-3.5"/> Timeline</div>
                  <div className="font-medium text-neutral-200">{lead.timeline || "Not Specified"}</div>
                </div>
              </div>
            </div>

            {lead.action_items.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-orange-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4"/> Pending Actions
                </h3>
                <ul className="space-y-3">
                  {lead.action_items.map(item => (
                    <li key={item.id} className="bg-neutral-900/50 p-3 rounded-lg border border-orange-500/10">
                      <div className="text-xs font-semibold text-neutral-300 mb-1">{item.task_type.replace('_', ' ')}</div>
                      <div className="text-sm text-neutral-400">{item.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </motion.div>

          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="lg:col-span-2">
             <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-[600px]">
                <div className="flex items-center gap-6 px-6 py-4 border-b border-neutral-800">
                  <button onClick={() => setActiveTab("overview")} className={cn("text-sm font-medium transition-colors", activeTab === "overview" ? "text-white" : "text-neutral-500 hover:text-neutral-300")}>AI Summaries</button>
                  <button onClick={() => setActiveTab("timeline")} className={cn("text-sm font-medium transition-colors", activeTab === "timeline" ? "text-white" : "text-neutral-500 hover:text-neutral-300")}>Raw Transcripts</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "overview" ? (
                    <div className="space-y-6">
                      {lead.sessions.length === 0 && <span className="text-neutral-500 text-sm">No call sessions recorded log yet.</span>}
                      {lead.sessions.map(session => (
                        <div key={session.id} className="bg-neutral-950 p-5 rounded-xl border border-neutral-800/50">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{session.direction} CALL</span>
                            <span className="text-xs text-neutral-500">{new Date(session.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-neutral-300 leading-relaxed">{session.summary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-8">
                       {lead.sessions.length === 0 && <span className="text-neutral-500 text-sm">No transcripts available.</span>}
                       {lead.sessions.map((session, sIdx) => (
                         <div key={session.id} className="space-y-4">
                           <div className="sticky top-0 bg-neutral-900/90 backdrop-blur-sm py-2 z-10 border-b border-neutral-800">
                             <div className="text-xs font-semibold text-neutral-400 uppercase">Session {sIdx + 1} • {new Date(session.created_at).toLocaleDateString()}</div>
                           </div>
                           <div className="space-y-3 font-urdu">
                             {session.transcript.map((msg, idx) => (
                               <div key={idx} className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
                                 <div className={cn("px-4 py-2 rounded-2xl text-[15px]", msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-neutral-800 text-neutral-200 rounded-bl-sm")}>
                                   {msg.text}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
             </div>
          </motion.div>
        </div>

        {showEditModal && (
          <LeadModal 
            lead={lead}
            onClose={() => setShowEditModal(false)} 
            onSave={() => {
              setShowEditModal(false);
              fetchLead();
            }} 
          />
        )}

      </div>
    </div>
  )
}
