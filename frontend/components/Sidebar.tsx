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
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
    { name: "Overview", href: "/overview", icon: LayoutDashboard },
    { name: "Agents", href: "/agents", icon: Bot },
    { name: "Live Console", href: "/console", icon: Terminal },
    { name: "RAG Search", href: "/rag", icon: Search },
    { name: "Price Prediction", href: "/avm", icon: Calculator },
    { name: "Analytics", href: "/analytics", icon: FileText },
    { name: "CRM Leads", href: "/crm", icon: Users },
    { name: "Tasks", href: "/crm/tasks", icon: CheckSquare },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (confirm("Are you sure you want to log out?")) {
            logout();
        }
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col z-50">
            {/* Brand / Header */}
            <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                <div className="w-6 h-6 bg-emerald-500 rounded-sm mr-3 flex items-center justify-center">
                    <span className="text-black font-bold text-sm">O</span>
                </div>
                <span className="font-bold text-white tracking-tight">ORICALO</span>
                <span className="ml-auto text-[10px] bg-neutral-900 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-800">BETA</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-neutral-900 text-white"
                                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-neutral-500")} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* User / Footer */}
            <div className="p-4 border-t border-neutral-800">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-gradient-to-tr from-emerald-600 to-indigo-600 flex-shrink-0" />
                        <div className="overflow-hidden">
                            <div className="text-sm font-medium text-neutral-200 truncate">{user?.full_name || "Admin User"}</div>
                            <div className="text-xs text-neutral-500 truncate">{user?.email || "admin@oricalo.com"}</div>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
