import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Ticker } from "@/components/Ticker";

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((q) => ({
      matches: reduce,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Ticker", () => {
  it("renders the final value immediately under prefers-reduced-motion", () => {
    mockReducedMotion(true);
    render(<Ticker value={247} format="number" />);
    expect(screen.getByText("247")).toBeInTheDocument();
  });

  it("uses formatPKR phrase style when format='pkr'", async () => {
    mockReducedMotion(true);
    render(<Ticker value={1_25_00_000} format="pkr" />);
    expect(await screen.findByText("1 crore 25 lakh")).toBeInTheDocument();
  });

  it("uses formatDuration when format='duration'", () => {
    mockReducedMotion(true);
    render(<Ticker value={9240} format="duration" />);
    expect(screen.getByText("2h 34m")).toBeInTheDocument();
  });

  it("animates to final value when motion is enabled", async () => {
    mockReducedMotion(false);
    render(<Ticker value={100} format="number" duration={0.1} />);
    await waitFor(
      () => expect(screen.getByText("100")).toBeInTheDocument(),
      { timeout: 1000 },
    );
  });
});
