/**
 * Unit tests for the apiFetch utility.
 *
 * Verifies that apiFetch correctly prepends API_BASE to paths and passes
 * through fetch options.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock fetch globally ─────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("apiFetch", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls fetch with the full URL using default API_BASE", async () => {
    // Use dynamic import so env is read fresh each time
    const { apiFetch } = await import("@/lib/api");
    await apiFetch("/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/agents"),
      undefined
    );
  });

  it("passes through fetch init options", async () => {
    const { apiFetch } = await import("@/lib/api");
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    };
    await apiFetch("/agents", init);
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), init);
  });

  it("prepends API_BASE to the path", async () => {
    const { apiFetch, API_BASE } = await import("@/lib/api");
    await apiFetch("/crm/leads");
    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/crm/leads`, undefined);
  });

  it("WS_BASE replaces http with ws", async () => {
    const { WS_BASE, API_BASE } = await import("@/lib/api");
    expect(WS_BASE).toBe(API_BASE.replace(/^http/, "ws"));
  });
});
