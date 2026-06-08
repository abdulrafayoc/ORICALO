"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Terminal,
  Users,
  CheckSquare,
  Settings,
  LogOut,
  Mic,
  Building2,
  BarChart3,
  Database,
  TrendingUp,
  Calendar,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useVoicePresence } from "@/context/voice-presence";
import { BrandMark } from "@/components/ui/brand-mark";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard, section: "Main" },
  { name: "Console", href: "/console", icon: Terminal, section: "Main" },
  { name: "Voice Agent", href: "/voice-agent", icon: Mic, section: "Main" },
  { name: "Agents", href: "/agents", icon: Bot, section: "AI Management" },
  { name: "RAG", href: "/rag", icon: Database, section: "AI Management" },
  { name: "AVM", href: "/avm", icon: TrendingUp, section: "AI Management" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, section: "Analytics" },
  { name: "Leads", href: "/crm", icon: Users, section: "CRM" },
  { name: "Property Visits", href: "/crm/schedules", icon: Calendar, section: "CRM" },
  { name: "Follow-ups", href: "/crm/follow-ups", icon: CheckSquare, section: "CRM" },
  { name: "Pipeline", href: "/crm/pipeline", icon: Building2, section: "CRM" },
  { name: "Tasks", href: "/crm/tasks", icon: ListTodo, section: "CRM" },
  { name: "Settings", href: "/settings", icon: Settings, section: "System" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { status } = useVoicePresence();

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) logout();
  };

  const grouped = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section]!.push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <aside className="w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <BrandMark size={30} pulse className="mr-3" />
        <div>
          <div className="font-serif text-lg leading-tight text-foreground">Oricalo</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            {user?.organization_id ? `Org · ${user.organization_id}` : "Karachi"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 px-2">
              {section}
            </div>
            <div className="space-y-px">
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const showVoiceDot = item.name === "Voice Agent" && status !== "idle";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-sm border-l-2 transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-foreground border-accent"
                        : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 opacity-70" />
                    <span>{item.name}</span>
                    {showVoiceDot && (
                      <StatusDot
                        state="live"
                        size="xs"
                        className="ml-auto presence-pulse"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between p-2 rounded-sm hover:bg-sidebar-accent transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user?.full_name} />
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-foreground truncate">
                {user?.full_name || "Admin User"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground truncate">
                {user?.email || "admin@oricalo.com"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
