"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Check, Phone, ArrowUpRight, Calendar, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Lead {
  id: number;
  name: string;
  phone_number: string;
}

interface ActionItem {
  id: number;
  task_type: string;
  description: string;
  status: string;
  created_at: string;
  lead: Lead;
}

export default function CRMTasks() {
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const fetchTasks = () => {
    fetch("http://127.0.0.1:8000/crm/action_items")
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tasks", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async (taskId: number) => {
    setCompletingId(taskId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/crm/action_items/${taskId}/complete`, {
        method: "POST"
      });
      if (res.ok) {
        // Remove task locally with animation
        setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
          setCompletingId(null);
        }, 500);
      }
    } catch (err) {
      console.error(err);
      setCompletingId(null);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-neutral-400" />
            Agent Action Queue
          </h1>
          <p className="text-neutral-400 mt-2">Manage follow-ups and human-intervention requests flagged by AI.</p>
        </div>

        {/* Task List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden min-h-[500px] p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4"><Check className="w-8 h-8 text-green-500" /></div>
              <h3 className="text-lg font-medium text-white mb-2">Inbox Zero</h3>
              <p className="text-sm text-neutral-500 max-w-sm">There are no pending actions. The AI has handled everything successfully so far.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {tasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "bg-neutral-950 border p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden transition-all",
                      completingId === task.id ? "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "border-neutral-800"
                    )}
                  >
                    {/* Top Bar */}
                    <div className="flex items-start justify-between">
                      <div className="px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        {task.task_type.replace('_', ' ')}
                      </div>
                      <span className="text-xs text-neutral-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(task.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Context / Lead Info */}
                    <div className="flex flex-col gap-1">
                      <Link href={`/crm/${task.lead.id}`} className="text-lg font-bold text-white hover:text-blue-400 transition flex items-center gap-1 group">
                        {task.lead.name}
                        <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="text-sm text-neutral-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {task.lead.phone_number || "No Phone"}
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="flex-1 bg-neutral-900/50 p-3 rounded-md border border-neutral-800 shrink-0">
                      <p className="text-sm text-neutral-300 leading-snug break-words">
                        {task.description}
                      </p>
                    </div>

                    {/* Action */}
                    <button 
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingId === task.id}
                      className="w-full mt-2 py-2.5 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-neutral-950 flex items-center justify-center gap-2
                        bg-neutral-800 text-neutral-300 hover:bg-green-600 hover:text-white"
                    >
                      {completingId === task.id ? (
                        <>Marking Complete...</>
                      ) : (
                        <><Check className="w-4 h-4" /> Mark as Done</>
                      )}
                    </button>
                    
                    {/* Animated Completion Overlay */}
                    <AnimatePresence>
                      {completingId === task.id && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }} 
                          className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] z-10 flex items-center justify-center"
                        >
                          <Check className="w-12 h-12 text-green-500 drop-shadow-lg" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
