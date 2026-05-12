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
  RefreshCw
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
          apiFetch('/analytics/recent-calls?limit=3')
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
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-neutral-500 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Calls", value: kpis?.total_calls || "0", icon: PhoneCall, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Qualified Leads", value: kpis?.qualified_leads || "0", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "PII Redacted", value: `${kpis?.pii_redacted_pct || 100}%`, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Avg Duration", value: kpis?.avg_duration || "0s", icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}</h1>
        <p className="text-neutral-500 mt-1">Here&apos;s what&apos;s happening with your AI agents today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} p-2.5 rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <Activity className="w-4 h-4 text-neutral-700" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main CTA */}
      <div className="bg-gradient-to-br from-emerald-600/10 to-indigo-600/10 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">Launch Voice Session</h2>
            <p className="text-neutral-400 max-w-md">Start a real-time voice session with one of your agents to test your latest configuration changes.</p>
          </div>
          <Link 
            href="/console" 
            className="flex items-center gap-3 bg-emerald-500 text-black font-bold px-8 py-4 rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            <Mic className="w-5 h-5" />
            Enter Console
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -z-10 group-hover:bg-emerald-500/10 transition-colors" />
      </div>

      {/* Recent Activity */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          </div>
          <Link href="/analytics" className="text-sm text-neutral-500 hover:text-emerald-500 transition-colors">View All</Link>
        </div>
        <div className="divide-y divide-neutral-800">
          {recentActivity.length === 0 ? (
            <div className="p-10 text-center text-neutral-500">No recent activity found.</div>
          ) : (
            recentActivity.map((activity: any) => (
              <div key={activity.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-emerald-500">
                    {activity.id[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-white">Call #{activity.id}</div>
                    <div className="text-sm text-neutral-500 truncate max-w-md">{activity.summary}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-xs text-neutral-600 font-medium">{activity.date}</div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Score</span>
                    <span className={Number(activity.lead_score) > 70 ? "text-emerald-500 font-bold" : "text-orange-500 font-bold"}>
                      {activity.lead_score}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
