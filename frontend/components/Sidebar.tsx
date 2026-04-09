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
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Agents", href: "/agents", icon: Bot },
    { name: "Live Console", href: "/console", icon: Terminal },
    { name: "CRM", href: "/crm", icon: Users },
    { name: "RAG Search", href: "/rag", icon: Search },
    { name: "Price Prediction", href: "/avm", icon: Calculator },
    { name: "Analytics", href: "/analytics", icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col z-50">
            {/* Brand / Header */}
            <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                <div className="w-6 h-6 bg-white rounded-sm mr-3 flex items-center justify-center">
                    <div className="w-3 h-3 bg-black rounded-sm" />
                </div>
                <span className="font-bold text-white tracking-tight">ORICALO</span>
                <span className="ml-auto text-[10px] bg-neutral-900 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-800">BETA</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-purple-600" />
                    <div className="overflow-hidden">
                        <div className="text-sm font-medium text-neutral-200 truncate">Admin User</div>
                        <div className="text-xs text-neutral-500 truncate">admin@oricalo.com</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
