'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  PhoneCall, 
  Flame, 
  TrendingUp, 
  Mic, 
  ArrowRight, 
  History,
  Activity,
  RefreshCw,
  Clock,
  DollarSign,
  Target,
  BarChart2
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

export default function OverviewPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, activityRes] = await Promise.all([
          apiFetch('/analytics/kpis'),
          apiFetch('/analytics/recent-calls?limit=5')
        ]);
        if (kpiRes.ok) setKpis(await kpiRes.json());
        if (activityRes.ok) setRecentActivity(await activityRes.json());
      } catch (err) {
        console.error("Overview data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-500 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Calls", value: kpis?.total_calls || "0", icon: PhoneCall, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", trend: "+12%" },
    { label: "Qualified Leads", value: kpis?.qualified_leads || "0", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", trend: "+8%" },
    { label: "PII Redacted", value: `${kpis?.pii_redacted_pct || 100}%`, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", trend: "100%" },
    { label: "Avg Duration", value: kpis?.avg_duration || "0s", icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", trend: "-5%" },
    { label: "Conversion Rate", value: "24.5%", icon: Target, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", trend: "+3%" },
    { label: "Revenue", value: "$12.4K", icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", trend: "+15%" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}. Here's your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link 
            href="/console" 
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Mic className="w-4 h-4" />
            New Call
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bg} ${stat.border} border p-2 rounded-lg`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hidden sm:flex">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-[10px] lg:text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg">
                <History className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <p className="text-xs text-slate-500">Latest call sessions and interactions</p>
              </div>
            </div>
            <Link href="/analytics" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500">No recent activity found.</p>
              </div>
            ) : (
              recentActivity.map((activity: any, index) => (
                <div key={activity.id} className="p-4 lg:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">Call Session #{activity.id}</div>
                      <div className="text-sm text-slate-500 truncate max-w-md">{activity.summary || "No summary available"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{activity.date || "Today"}</div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Score</span>
                        <span className={Number(activity.lead_score) > 70 ? "text-emerald-400 font-bold" : "text-orange-400 font-bold"}>
                          {activity.lead_score || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] -z-10" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Start Voice Session</h3>
              <p className="text-slate-400 text-sm mb-4">Launch a real-time voice session with your AI agent.</p>
              <Link 
                href="/console" 
                className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-all shadow-lg"
              >
                <Mic className="w-4 h-4" />
                Start Now
              </Link>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Performance</h3>
                <p className="text-xs text-slate-500">This week's metrics</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Call Success Rate</span>
                  <span className="text-white font-medium">94%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Lead Quality</span>
                  <span className="text-white font-medium">78%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Response Time</span>
                  <span className="text-white font-medium">89%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '89%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
