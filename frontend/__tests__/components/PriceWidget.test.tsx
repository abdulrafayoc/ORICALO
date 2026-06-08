import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PriceWidget from "@/components/PriceWidget";

describe("PriceWidget", () => {
    it("renders the valuation estimate heading", () => {
        render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.8} />);
        // P4: sentence case
        expect(screen.getByText("Valuation estimate")).toBeInTheDocument();
    });

    it("formats Lakh correctly", () => {
        render(<PriceWidget minPrice={150000} maxPrice={250000} confidence={0.8} />);
        // P4: separator changed from hyphen to en-dash
        expect(screen.getByText(/1\.50 Lakh\s+[-–]\s+2\.50 Lakh/i)).toBeInTheDocument();
    });

    it("formats Crore correctly", () => {
        render(<PriceWidget minPrice={15000000} maxPrice={25000000} confidence={0.8} />);
        // P4: also abbreviated Crore → Cr
        expect(screen.getByText(/1\.50 Cr\s+[-–]\s+2\.50 Cr/i)).toBeInTheDocument();
    });

    it("displays confidence bar color correctly for high confidence", () => {
        const { container } = render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.9} />);
        // P4: high-confidence bar uses design token bg-accent instead of bg-emerald-500
        const bar = container.querySelector(".bg-accent");
        expect(bar).toBeInTheDocument();
    });

    it("displays confidence bar color correctly for low confidence", () => {
        const { container } = render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.5} />);
        const bar = container.querySelector(".bg-yellow-500");
        expect(bar).toBeInTheDocument();
    });
});
