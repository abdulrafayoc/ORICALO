/**
 * Unit tests for the Sidebar navigation component.
 *
 * We mock next/navigation and next/link so we can render in jsdom
 * without a real Next.js router.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/Sidebar";

// ── Mock next/navigation ────────────────────────────────────────────────
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// ── Mock next/link — render as a plain <a> so hrefs are testable ────────
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ── Mock lucide-react icons to lightweight stubs ────────────────────────
vi.mock("lucide-react", () => ({
  LayoutDashboard: () => <svg data-testid="icon-overview" />,
  Bot:             () => <svg data-testid="icon-agents" />,
  Terminal:        () => <svg data-testid="icon-console" />,
  FileText:        () => <svg data-testid="icon-analytics" />,
  Search:          () => <svg data-testid="icon-rag" />,
  Calculator:      () => <svg data-testid="icon-avm" />,
  Users:           () => <svg data-testid="icon-crm" />,
  CheckSquare:     () => <svg data-testid="icon-tasks" />,
}));

describe("Sidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders the ORICALO brand name", () => {
    render(<Sidebar />);
    expect(screen.getByText("ORICALO")).toBeInTheDocument();
  });

  it("renders the BETA badge", () => {
    render(<Sidebar />);
    expect(screen.getByText("BETA")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Live Console")).toBeInTheDocument();
    expect(screen.getByText("RAG Search")).toBeInTheDocument();
    expect(screen.getByText("Price Prediction")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("CRM Leads")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });

  it("renders correct hrefs for each nav item", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /agents/i })).toHaveAttribute("href", "/agents");
    expect(screen.getByRole("link", { name: /crm leads/i })).toHaveAttribute("href", "/crm");
    expect(screen.getByRole("link", { name: /analytics/i })).toHaveAttribute("href", "/analytics");
  });

  it("marks the active route with active styling", () => {
    mockUsePathname.mockReturnValue("/agents");
    render(<Sidebar />);
    const agentsLink = screen.getByRole("link", { name: /agents/i });
    expect(agentsLink.className).toContain("bg-neutral-900");
    expect(agentsLink.className).toContain("text-white");
  });

  it("does not apply active styling to inactive routes", () => {
    mockUsePathname.mockReturnValue("/agents");
    render(<Sidebar />);
    const crmLink = screen.getByRole("link", { name: /crm leads/i });
    expect(crmLink.className).toContain("text-neutral-400");
  });

  it("renders admin user footer", () => {
    render(<Sidebar />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@oricalo.com")).toBeInTheDocument();
  });
});
