"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/ui/brand-mark";
import { VoicePresenceProvider } from "@/context/voice-presence";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={36} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Initializing
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <VoicePresenceProvider>
      <TooltipProvider>
        <div className="flex min-h-screen bg-background">
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-background/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div
            className={`fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 lg:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar />
          </div>

          <div className="flex-1 flex flex-col lg:ml-72">
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden sm:block max-w-sm flex-1">
                  <Input
                    mono
                    placeholder="search"
                    leftIcon={<Search className="w-4 h-4" />}
                    rightHint="⌘K"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-border">
                  <Avatar name={user?.full_name} />
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-foreground">
                      {user?.full_name || "User"}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {user?.email || "user@oricalo.com"}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="max-w-[1800px] mx-auto p-4 lg:p-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
            <Toaster />
          </div>
        </div>
      </TooltipProvider>
    </VoicePresenceProvider>
  );
}
