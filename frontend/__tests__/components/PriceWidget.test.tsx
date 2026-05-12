import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PriceWidget from "@/components/PriceWidget";

describe("PriceWidget", () => {
    it("renders the valuation estimate heading", () => {
        render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.8} />);
        expect(screen.getByText("Valuation Estimate")).toBeInTheDocument();
    });

    it("formats Lakh correctly", () => {
        render(<PriceWidget minPrice={150000} maxPrice={250000} confidence={0.8} />);
        expect(screen.getByText(/1.50 Lakh - 2.50 Lakh/i)).toBeInTheDocument();
    });

    it("formats Crore correctly", () => {
        render(<PriceWidget minPrice={15000000} maxPrice={25000000} confidence={0.8} />);
        expect(screen.getByText(/1.50 Cr - 2.50 Cr/i)).toBeInTheDocument();
    });

    it("displays confidence bar color correctly for high confidence", () => {
        const { container } = render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.9} />);
        const bar = container.querySelector(".bg-emerald-500");
        expect(bar).toBeInTheDocument();
    });

    it("displays confidence bar color correctly for low confidence", () => {
        const { container } = render(<PriceWidget minPrice={100000} maxPrice={200000} confidence={0.5} />);
        const bar = container.querySelector(".bg-yellow-500");
        expect(bar).toBeInTheDocument();
    });
});
