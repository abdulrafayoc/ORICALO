/**
 * Unit tests for the Sidebar navigation component (post-P1 repaint).
 *
 * Mocks next/navigation, next/link, lucide icons, AuthContext, and
 * VoicePresenceContext to render in jsdom without real providers.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/Sidebar";

// ── Mock next/navigation ───────────────────────────────────────────────
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// ── Mock next/link as a plain anchor ───────────────────────────────────
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ── Mock lucide-react icons as lightweight stubs ───────────────────────
vi.mock("lucide-react", () => {
  const Stub = () => <svg />;
  return {
    LayoutDashboard: Stub,
    Bot: Stub,
    Terminal: Stub,
    Users: Stub,
    CheckSquare: Stub,
    Settings: Stub,
    LogOut: Stub,
    Mic: Stub,
    Building2: Stub,
    BarChart3: Stub,
    Database: Stub,
    TrendingUp: Stub,
    Calendar: Stub,
    ListTodo: Stub,
  };
});

// ── Mock auth-context ──────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Mock voice-presence ────────────────────────────────────────────────
const mockUseVoicePresence = vi.fn();
vi.mock("@/context/voice-presence", () => ({
  useVoicePresence: () => mockUseVoicePresence(),
}));

describe("Sidebar (post-P1 repaint)", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      user: null,
      logout: vi.fn(),
    });
    mockUseVoicePresence.mockReturnValue({
      status: "idle",
      amplitude: 0,
      setStatus: vi.fn(),
      setAmplitude: vi.fn(),
    });
  });

  it("renders the Oricalo brand in serif", () => {
    render(<Sidebar />);
    expect(screen.getByText("Oricalo")).toBeInTheDocument();
  });

  it("renders the org/city subtitle in mono uppercase", () => {
    render(<Sidebar />);
    // Falls back to "Karachi" when no user
    expect(screen.getByText("Karachi")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByText("Voice Agent")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("RAG")).toBeInTheDocument();
    expect(screen.getByText("AVM")).toBeInTheDocument();
    // "Analytics" appears twice (section header + nav item) — use getByRole for the nav link
    expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("Property Visits")).toBeInTheDocument();
    expect(screen.getByText("Follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders correct hrefs for nav items", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /agents/i })).toHaveAttribute("href", "/agents");
    expect(screen.getByRole("link", { name: /^leads$/i })).toHaveAttribute("href", "/crm");
    expect(screen.getByRole("link", { name: /pipeline/i })).toHaveAttribute("href", "/crm/pipeline");
  });

  it("marks the active route with the left-border accent indicator", () => {
    mockUsePathname.mockReturnValue("/agents");
    render(<Sidebar />);
    const agentsLink = screen.getByRole("link", { name: /agents/i });
    expect(agentsLink.className).toContain("border-accent");
    expect(agentsLink.className).toContain("text-foreground");
  });

  it("does not apply active styling to inactive routes", () => {
    mockUsePathname.mockReturnValue("/agents");
    render(<Sidebar />);
    const leadsLink = screen.getByRole("link", { name: /^leads$/i });
    expect(leadsLink.className).toContain("text-muted-foreground");
    expect(leadsLink.className).toContain("border-transparent");
  });

  it("renders the admin user footer when no user is present", () => {
    render(<Sidebar />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@oricalo.com")).toBeInTheDocument();
  });

  it("shows the voice-presence dot beside Voice Agent when status is not idle", () => {
    mockUseVoicePresence.mockReturnValue({
      status: "listening",
      amplitude: 0,
      setStatus: vi.fn(),
      setAmplitude: vi.fn(),
    });
    const { container } = render(<Sidebar />);
    // The presence dot has the .presence-pulse utility class
    expect(container.querySelector(".presence-pulse")).not.toBeNull();
  });

  it("hides the voice-presence dot when status is idle", () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector(".presence-pulse")).toBeNull();
  });
});
