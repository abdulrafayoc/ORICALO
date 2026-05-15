"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, MoreHorizontal, User, Phone, Mail, DollarSign, MapPin, Clock, TrendingUp, AlertCircle, Calendar as CalendarIcon, Video, MessageSquare, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { calendarApi, Meeting } from "@/lib/calendar-api";

interface PipelineLead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  stage: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  value: number;
  location: string | null;
  last_activity: string;
  probability: number;
}

const STAGES = [
  { id: "new", name: "New", color: "slate" },
  { id: "contacted", name: "Contacted", color: "blue" },
  { id: "qualified", name: "Qualified", color: "indigo" },
  { id: "proposal", name: "Proposal", color: "purple" },
  { id: "negotiation", name: "Negotiation", color: "orange" },
  { id: "closed_won", name: "Closed Won", color: "emerald" },
  { id: "closed_lost", name: "Closed Lost", color: "red" },
] as const;

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Fetch leads from CRM API
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/crm/leads`);
        if (response.ok) {
          const data = await response.json();
          // Transform CRM leads to PipelineLead format
          const transformedLeads = data.map((lead: any) => ({
            id: lead.id,
            name: lead.name || "Unknown",
            phone: lead.phone_number || "No phone",
            email: lead.email,
            stage: lead.status.toLowerCase() as any,
            value: lead.budget ? parseInt(lead.budget.replace(/[^0-9]/g, '')) || 0 : 0,
            location: lead.location_pref,
            last_activity: lead.updated_at?.split('T')[0] || "N/A",
            probability: lead.lead_score || 0
          }));
          setLeads(transformedLeads);
        }
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        // Fallback to mock data if API fails
        setLeads([
          {
            id: 1,
            name: "John Smith",
            phone: "+92 300 1234567",
            email: "john.smith@email.com",
            stage: "new",
            value: 5000000,
            location: "Downtown",
            last_activity: "2026-05-15",
            probability: 20
          },
          {
            id: 2,
            name: "Emily Davis",
            phone: "+92 301 2345678",
            email: "emily.davis@email.com",
            stage: "contacted",
            value: 7500000,
            location: "Suburbs",
            last_activity: "2026-05-14",
            probability: 40
          },
          {
            id: 3,
            name: "Michael Brown",
            phone: "+92 302 3456789",
            email: "michael.brown@email.com",
            stage: "qualified",
            value: 12000000,
            location: "Commercial",
            last_activity: "2026-05-13",
            probability: 60
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  // Fetch meetings from calendar API
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const meetingsData = await calendarApi.getMeetings({ status: "SCHEDULED" });
        setMeetings(meetingsData);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        // Fallback to empty array if API fails
        setMeetings([]);
      }
    };

    fetchMeetings();
  }, []);

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.stage === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return leads.filter(lead => lead.stage === stageId).reduce((sum, lead) => sum + lead.value, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStageColor = (color: string) => {
    const colors = {
      slate: "bg-slate-500/20 border-slate-500/30",
      blue: "bg-blue-500/20 border-blue-500/30",
      indigo: "bg-indigo-500/20 border-indigo-500/30",
      purple: "bg-purple-500/20 border-purple-500/30",
      orange: "bg-orange-500/20 border-orange-500/30",
      emerald: "bg-emerald-500/20 border-emerald-500/30",
      red: "bg-red-500/20 border-red-500/30",
    };
    return colors[color as keyof typeof colors] || colors.slate;
  };

  const getStageTextColor = (color: string) => {
    const colors = {
      slate: "text-slate-400",
      blue: "text-blue-400",
      indigo: "text-indigo-400",
      purple: "text-purple-400",
      orange: "text-orange-400",
      emerald: "text-emerald-400",
      red: "text-red-400",
    };
    return colors[color as keyof typeof colors] || colors.slate;
  };

  const getStageBadge = (stage: string) => {
    const stageConfig = STAGES.find(s => s.id === stage);
    if (!stageConfig) return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold">Unknown</span>;
    return <span className={`${getStageColor(stageConfig.color)} ${getStageTextColor(stageConfig.color)} px-2 py-1 rounded-lg text-xs font-semibold`}>{stageConfig.name}</span>;
  };

  const totalPipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const weightedPipelineValue = leads.reduce((sum, lead) => sum + (lead.value * lead.probability / 100), 0);

  const handleScheduleMeeting = (lead: PipelineLead) => {
    setSelectedLead(lead);
    setShowScheduleModal(true);
  };

  const handleViewCalendar = () => {
    setShowCalendarView(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Sales Pipeline</h1>
          <p className="text-slate-400 mt-1">Track leads through your sales process</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={handleViewCalendar}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 border border-slate-700"
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </button>
          <button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </header>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Total Pipeline Value</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : formatCurrency(totalPipelineValue)}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Weighted Pipeline</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : formatCurrency(weightedPipelineValue)}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Active Deals</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : leads.filter(l => l.stage !== "closed_won" && l.stage !== "closed_lost").length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search leads..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[140px]">
            <option value="all">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Pipeline Leads</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition border border-slate-700">
              <Filter className="w-4 h-4"/> Filter
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left text-sm text-slate-400 min-w-[900px]">
            <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Lead</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Stage</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Value</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Location</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Probability</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">Last Activity</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 sm:px-4 py-3"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-6 bg-slate-800 rounded w-16"></div></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-4 bg-slate-800 rounded w-32"></div></td>
                    <td className="px-3 sm:px-4 py-3"><div className="h-2 bg-slate-800 rounded w-16"></div></td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                    <td className="px-3 sm:px-4 py-3 text-right"><div className="h-4 bg-slate-800 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No leads in pipeline.<br/>
                    Add your first lead to get started.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-200 truncate text-sm">{lead.name}</div>
                          <div className="text-xs mt-0.5 opacity-70 truncate">{lead.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {getStageBadge(lead.stage)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-mono text-slate-300 whitespace-nowrap text-sm">{formatCurrency(lead.value)}</td>
                    <td className="px-3 sm:px-4 py-3 truncate max-w-[120px] text-sm">{lead.location || "—"}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium text-sm", lead.probability >= 70 ? "text-emerald-400" : "text-slate-400")}>{lead.probability}%</span>
                        <div className="w-10 sm:w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                          <div 
                            className={cn("h-full", lead.probability >= 70 ? "bg-emerald-500" : lead.probability >= 40 ? "bg-blue-500" : "bg-orange-500")}
                            style={{ width: `${lead.probability}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 text-sm hidden sm:table-cell">{lead.last_activity}</td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="flex items-center gap-1 sm:gap-2 justify-end">
                        <button 
                          onClick={() => handleScheduleMeeting(lead)}
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          title="Schedule Meeting"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Call">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Edit">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Schedule Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Lead</label>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white">
                  {selectedLead.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Meeting Type</label>
                <select 
                  id="meetingType"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="VISIT">Property Visit</option>
                  <option value="CALL">Phone Call</option>
                  <option value="VIDEO">Video Meeting</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Date</label>
                  <input 
                    id="meetingDate"
                    type="date" 
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Time</label>
                  <input 
                    id="meetingTime"
                    type="time" 
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea 
                  id="meetingNotes"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 h-20 resize-none" 
                  placeholder="Add any notes for this meeting..."
                ></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const meetingType = (document.getElementById('meetingType') as HTMLSelectElement)?.value || 'VISIT';
                  const meetingDate = (document.getElementById('meetingDate') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
                  const meetingTime = (document.getElementById('meetingTime') as HTMLInputElement)?.value || '12:00';
                  const meetingNotes = (document.getElementById('meetingNotes') as HTMLTextAreaElement)?.value || '';
                  
                  try {
                    const newMeeting = await calendarApi.bookMeeting({
                      lead_id: selectedLead.id,
                      meeting_type: meetingType as "VISIT" | "CALL" | "VIDEO",
                      scheduled_date: meetingDate,
                      scheduled_time: meetingTime,
                      duration_minutes: 60,
                      notes: meetingNotes
                    });
                    
                    setMeetings([...meetings, newMeeting]);
                    setShowScheduleModal(false);
                  } catch (error) {
                    console.error("Failed to book meeting:", error);
                    alert("Failed to book meeting. Please try again.");
                  }
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View Modal */}
      {showCalendarView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Scheduled Meetings</h3>
              <button 
                onClick={() => setShowCalendarView(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {meetings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled meetings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          meeting.meeting_type === 'VISIT' ? 'bg-indigo-500/20 text-indigo-400' :
                          meeting.meeting_type === 'CALL' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {meeting.meeting_type === 'VISIT' ? <MapPin className="w-6 h-6" /> :
                           meeting.meeting_type === 'CALL' ? <Phone className="w-6 h-6" /> :
                           <Video className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{meeting.title}</h4>
                          <p className="text-sm text-slate-400 mt-1">{meeting.lead_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {meeting.scheduled_date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meeting.scheduled_time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
