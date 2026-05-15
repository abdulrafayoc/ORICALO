"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Bot,
    Terminal,
    FileText,
    Search,
    Calculator,
    Users,
    CheckSquare,
    Settings,
    LogOut,
    Mic,
    Building2,
    Phone,
    BarChart3,
    Database,
    TrendingUp,
    Calendar,
    ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
    // Main
    { name: "Overview", href: "/overview", icon: LayoutDashboard, section: "Main" },
    { name: "Console", href: "/console", icon: Terminal, section: "Main" },
    { name: "Voice Agent", href: "/voice-agent", icon: Mic, section: "Main" },
    
    // AI Management
    { name: "Agents", href: "/agents", icon: Bot, section: "AI Management" },
    { name: "RAG", href: "/rag", icon: Database, section: "AI Management" },
    { name: "AVM", href: "/avm", icon: TrendingUp, section: "AI Management" },
    
    // Analytics
    { name: "Analytics", href: "/analytics", icon: BarChart3, section: "Analytics" },
    
    // CRM
    { name: "Leads", href: "/crm", icon: Users, section: "CRM" },
    { name: "Property Visits", href: "/crm/schedules", icon: Calendar, section: "CRM" },
    { name: "Follow-ups", href: "/crm/follow-ups", icon: CheckSquare, section: "CRM" },
    { name: "Pipeline", href: "/crm/pipeline", icon: Building2, section: "CRM" },
    { name: "Tasks", href: "/crm/tasks", icon: ListTodo, section: "CRM" },
    
    // System
    { name: "Settings", href: "/settings", icon: Settings, section: "System" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (confirm("Are you sure you want to log out?")) {
            logout();
        }
    };

    // Group items by section
    const groupedItems = NAV_ITEMS.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {} as Record<string, typeof NAV_ITEMS>);

    return (
        <aside className="w-72 h-full bg-slate-900 border-r border-slate-800 flex flex-col">
            {/* Brand / Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mr-3 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-white font-bold text-sm">O</span>
                </div>
                <div>
                    <span className="font-bold text-white tracking-tight text-lg">ORICALO</span>
                    <div className="text-[10px] text-indigo-400 font-medium">ENTERPRISE</div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
                {Object.entries(groupedItems).map(([section, items]) => (
                    <div key={section}>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                            {section}
                        </div>
                        <div className="space-y-1">
                            {items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-slate-500")} />
                                        {item.name}
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User / Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-medium text-white truncate">{user?.full_name || "Admin User"}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email || "admin@oricalo.com"}</div>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
