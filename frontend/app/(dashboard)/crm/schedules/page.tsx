"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, User, Plus, Filter, Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyVisit {
  id: number;
  lead_id: number;
  lead_name: string;
  property_address: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  agent: string;
}

export default function SchedulesPage() {
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<PropertyVisit | null>(null);

  // Mock data - replace with API call
  useEffect(() => {
    setTimeout(() => {
      setVisits([
        {
          id: 1,
          lead_id: 1,
          lead_name: "John Smith",
          property_address: "123 Main Street, Downtown",
          scheduled_date: "2026-05-20",
          scheduled_time: "10:00 AM",
          status: "scheduled",
          notes: "Interested in 2-bedroom unit",
          agent: "Sarah Johnson"
        },
        {
          id: 2,
          lead_id: 2,
          lead_name: "Emily Davis",
          property_address: "456 Oak Avenue, Suburbs",
          scheduled_date: "2026-05-21",
          scheduled_time: "2:00 PM",
          status: "scheduled",
          notes: "Looking for family home",
          agent: "Mike Wilson"
        },
        {
          id: 3,
          lead_id: 3,
          lead_name: "Michael Brown",
          property_address: "789 Pine Road, Commercial",
          scheduled_date: "2026-05-19",
          scheduled_time: "11:00 AM",
          status: "completed",
          notes: "Very interested, follow up required",
          agent: "Sarah Johnson"
        },
        {
          id: 4,
          lead_id: 4,
          lead_name: "Jessica Taylor",
          property_address: "321 Elm Street, Downtown",
          scheduled_date: "2026-05-18",
          scheduled_time: "3:00 PM",
          status: "cancelled",
          notes: "Rescheduled to next week",
          agent: "Mike Wilson"
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Scheduled</span>;
      case "completed":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Completed</span>;
      case "cancelled":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Cancelled</span>;
      case "no_show":
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-lg text-xs font-semibold">No Show</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold">Unknown</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-400" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "no_show":
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredVisits = visits.filter(visit => {
    const matchesStatus = filterStatus === "all" || visit.status === filterStatus;
    const matchesSearch = searchQuery === "" || 
      visit.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visit.property_address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const scheduledCount = visits.filter(v => v.status === "scheduled").length;
  const completedCount = visits.filter(v => v.status === "completed").length;
  const cancelledCount = visits.filter(v => v.status === "cancelled").length;

  const handleScheduleVisit = () => {
    setSelectedVisit(null);
    setShowModal(true);
  };

  const handleEditVisit = (visit: PropertyVisit) => {
    setSelectedVisit(visit);
    setShowModal(true);
  };

  const handleCompleteVisit = (visit: PropertyVisit) => {
    setVisits(visits.map(v => v.id === visit.id ? { ...v, status: "completed" as const } : v));
  };

  const handleCancelVisit = (visit: PropertyVisit) => {
    setVisits(visits.map(v => v.id === visit.id ? { ...v, status: "cancelled" as const } : v));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Property Visits</h1>
          <p className="text-slate-400 mt-1">Schedule and manage property viewings</p>
        </div>
        <button 
          onClick={handleScheduleVisit}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Schedule Visit
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Scheduled</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : scheduledCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Completed</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : completedCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-slate-400 text-sm font-medium">Cancelled</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : cancelledCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search visits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === "all"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus("scheduled")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === "scheduled"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            )}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === "completed"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            )}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterStatus("cancelled")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === "cancelled"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            )}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Visits List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading visits...
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No visits found</p>
            <p className="text-xs mt-2 opacity-60">Schedule your first property visit</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredVisits.map((visit) => (
              <div key={visit.id} className="p-6 hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(visit.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white">{visit.lead_name}</h3>
                        {getStatusBadge(visit.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {visit.property_address}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {visit.scheduled_date}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {visit.scheduled_time}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {visit.agent}
                        </div>
                      </div>
                      {visit.notes && (
                        <div className="mt-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-2">
                          {visit.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:ml-4">
                    <button 
                      onClick={() => handleEditVisit(visit)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition border border-slate-700"
                    >
                      Edit
                    </button>
                    {visit.status === "scheduled" && (
                      <>
                        <button 
                          onClick={() => handleCompleteVisit(visit)}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm rounded-lg transition border border-emerald-500/30"
                        >
                          Complete
                        </button>
                        <button 
                          onClick={() => handleCancelVisit(visit)}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition border border-red-500/30"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">{selectedVisit ? "Edit Visit" : "Schedule Visit"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Lead Name</label>
                <input 
                  type="text" 
                  defaultValue={selectedVisit?.lead_name || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Enter lead name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Property Address</label>
                <input 
                  type="text" 
                  defaultValue={selectedVisit?.property_address || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Enter property address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Date</label>
                  <input 
                    type="date" 
                    defaultValue={selectedVisit?.scheduled_date || ""}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Time</label>
                  <input 
                    type="time" 
                    defaultValue={selectedVisit?.scheduled_time || ""}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Agent</label>
                <input 
                  type="text" 
                  defaultValue={selectedVisit?.agent || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Assign agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea 
                  defaultValue={selectedVisit?.notes || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 h-20 resize-none" 
                  placeholder="Add any notes..."
                ></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20">
                {selectedVisit ? "Update" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
