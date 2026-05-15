"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Clock, AlertCircle, User, Phone, Mail, Plus, Filter, Search, CheckCircle2, Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUp {
  id: number;
  lead_id: number;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  type: "call" | "email" | "meeting" | "task";
  subject: string;
  due_date: string;
  due_time: string;
  status: "pending" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  notes: string | null;
  assigned_to: string;
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  // Mock data - replace with API call
  useEffect(() => {
    setTimeout(() => {
      setFollowUps([
        {
          id: 1,
          lead_id: 1,
          lead_name: "John Smith",
          lead_phone: "+92 300 1234567",
          lead_email: "john.smith@email.com",
          type: "call",
          subject: "Follow up on property interest",
          due_date: "2026-05-16",
          due_time: "10:00 AM",
          status: "pending",
          priority: "high",
          notes: "Interested in downtown property",
          assigned_to: "Sarah Johnson"
        },
        {
          id: 2,
          lead_id: 2,
          lead_name: "Emily Davis",
          lead_phone: "+92 301 2345678",
          lead_email: "emily.davis@email.com",
          type: "email",
          subject: "Send property brochure",
          due_date: "2026-05-17",
          due_time: "2:00 PM",
          status: "pending",
          priority: "medium",
          notes: "Request for detailed information",
          assigned_to: "Mike Wilson"
        },
        {
          id: 3,
          lead_id: 3,
          lead_name: "Michael Brown",
          lead_phone: "+92 302 3456789",
          lead_email: "michael.brown@email.com",
          type: "meeting",
          subject: "Property viewing appointment",
          due_date: "2026-05-15",
          due_time: "3:00 PM",
          status: "overdue",
          priority: "high",
          notes: "Reschedule required",
          assigned_to: "Sarah Johnson"
        },
        {
          id: 4,
          lead_id: 4,
          lead_name: "Jessica Taylor",
          lead_phone: "+92 303 4567890",
          lead_email: null,
          type: "task",
          subject: "Update lead information",
          due_date: "2026-05-14",
          due_time: "11:00 AM",
          status: "completed",
          priority: "low",
          notes: "Updated budget preferences",
          assigned_to: "Mike Wilson"
        },
        {
          id: 5,
          lead_id: 5,
          lead_name: "David Wilson",
          lead_phone: "+92 304 5678901",
          lead_email: "david.wilson@email.com",
          type: "call",
          subject: "Discuss financing options",
          due_date: "2026-05-18",
          due_time: "4:00 PM",
          status: "pending",
          priority: "medium",
          notes: "Pre-approved for mortgage",
          assigned_to: "Sarah Johnson"
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Pending</span>;
      case "completed":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Completed</span>;
      case "overdue":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Overdue</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold">Unknown</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold">High</span>;
      case "medium":
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Medium</span>;
      case "low":
        return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-1 rounded-lg text-xs font-semibold">Low</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold">Unknown</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4 text-indigo-400" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "meeting":
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-purple-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredFollowUps = followUps.filter(followUp => {
    const matchesStatus = filterStatus === "all" || followUp.status === filterStatus;
    const matchesPriority = filterPriority === "all" || followUp.priority === filterPriority;
    const matchesSearch = searchQuery === "" || 
      followUp.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      followUp.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const pendingCount = followUps.filter(f => f.status === "pending").length;
  const overdueCount = followUps.filter(f => f.status === "overdue").length;
  const completedCount = followUps.filter(f => f.status === "completed").length;
  const highPriorityCount = followUps.filter(f => f.priority === "high" && f.status !== "completed").length;

  const handleAddFollowUp = () => {
    setSelectedFollowUp(null);
    setShowModal(true);
  };

  const handleEditFollowUp = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowModal(true);
  };

  const handleCompleteFollowUp = (followUp: FollowUp) => {
    setFollowUps(followUps.map(f => f.id === followUp.id ? { ...f, status: "completed" as const } : f));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Follow-ups</h1>
          <p className="text-slate-400 mt-1">Track and manage pending actions</p>
        </div>
        <button 
          onClick={handleAddFollowUp}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Follow-up
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <div className="text-slate-400 text-sm font-medium">Pending</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : pendingCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="text-slate-400 text-sm font-medium">Overdue</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : overdueCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div className="text-slate-400 text-sm font-medium">Completed</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : completedCount}</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <div className="text-slate-400 text-sm font-medium">High Priority</div>
          </div>
          <div className="text-3xl font-bold text-white">{loading ? "-" : highPriorityCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading follow-ups...
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No follow-ups found</p>
            <p className="text-xs mt-2 opacity-60">Create your first follow-up task</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredFollowUps.map((followUp) => (
              <div key={followUp.id} className={cn(
                "p-6 hover:bg-slate-800/50 transition-colors",
                followUp.status === "overdue" && "bg-red-950/10"
              )}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(followUp.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white">{followUp.subject}</h3>
                        {getStatusBadge(followUp.status)}
                        {getPriorityBadge(followUp.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {followUp.lead_name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          {followUp.lead_phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {followUp.due_date}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {followUp.due_time}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {followUp.assigned_to}
                        </div>
                      </div>
                      {followUp.notes && (
                        <div className="mt-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-2">
                          {followUp.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:ml-4">
                    {followUp.status !== "completed" && (
                      <button 
                        onClick={() => handleCompleteFollowUp(followUp)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm rounded-lg transition border border-emerald-500/30"
                      >
                        Complete
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditFollowUp(followUp)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition border border-slate-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Follow-up Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">{selectedFollowUp ? "Edit Follow-up" : "Add Follow-up"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Lead Name</label>
                <input 
                  type="text" 
                  defaultValue={selectedFollowUp?.lead_name || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Enter lead name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Subject</label>
                <input 
                  type="text" 
                  defaultValue={selectedFollowUp?.subject || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Enter subject"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Type</label>
                  <select 
                    defaultValue={selectedFollowUp?.type || "call"}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Priority</label>
                  <select 
                    defaultValue={selectedFollowUp?.priority || "medium"}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    defaultValue={selectedFollowUp?.due_date || ""}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Due Time</label>
                  <input 
                    type="time" 
                    defaultValue={selectedFollowUp?.due_time || ""}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Assigned To</label>
                <input 
                  type="text" 
                  defaultValue={selectedFollowUp?.assigned_to || ""}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" 
                  placeholder="Assign to agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea 
                  defaultValue={selectedFollowUp?.notes || ""}
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
                {selectedFollowUp ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
