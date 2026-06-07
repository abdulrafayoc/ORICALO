import { describe, it, expect } from "vitest";
import { formatPKR, formatNumber, formatDuration } from "@/lib/format";

describe("formatPKR — crore/lakh phrasing (default)", () => {
  it("zero", () => {
    expect(formatPKR(0)).toBe("0");
  });
  it("under one lakh — plain rupees", () => {
    expect(formatPKR(85_000)).toBe("85,000");
  });
  it("exactly one lakh", () => {
    expect(formatPKR(1_00_000)).toBe("1 lakh");
  });
  it("multiple lakhs with no remainder", () => {
    expect(formatPKR(25_00_000)).toBe("25 lakh");
  });
  it("lakhs with remainder thousands", () => {
    expect(formatPKR(2_50_000)).toBe("2 lakh 50 thousand");
  });
  it("exactly one crore", () => {
    expect(formatPKR(1_00_00_000)).toBe("1 crore");
  });
  it("crore with lakhs remainder", () => {
    expect(formatPKR(1_25_00_000)).toBe("1 crore 25 lakh");
  });
  it("crore with lakhs and thousands remainder", () => {
    expect(formatPKR(1_25_50_000)).toBe("1 crore 25 lakh 50 thousand");
  });
  it("many crores", () => {
    expect(formatPKR(1000_00_00_000)).toBe("1000 crore");
  });
});

describe("formatPKR — Indian-grouping numeric (toggle)", () => {
  it("renders ₨ + Indian grouping when style='numeric'", () => {
    expect(formatPKR(1_25_00_000, { style: "numeric" })).toBe("₨ 1,25,00,000");
  });
  it("renders ₨ 0 for zero in numeric mode", () => {
    expect(formatPKR(0, { style: "numeric" })).toBe("₨ 0");
  });
});

describe("formatNumber", () => {
  it("integer with grouping", () => {
    expect(formatNumber(247)).toBe("247");
    expect(formatNumber(12345)).toBe("12,345");
  });
  it("rounds to integer by default", () => {
    expect(formatNumber(12.7)).toBe("13");
  });
  it("respects precision option", () => {
    expect(formatNumber(12.346, { precision: 2 })).toBe("12.35");
  });
});

describe("formatDuration", () => {
  it("seconds", () => {
    expect(formatDuration(45)).toBe("45s");
  });
  it("minutes only", () => {
    expect(formatDuration(180)).toBe("3m");
  });
  it("minutes and seconds", () => {
    expect(formatDuration(185)).toBe("3m 5s");
  });
  it("hours and minutes", () => {
    expect(formatDuration(9240)).toBe("2h 34m");
  });
});
