import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RagWidget from "@/components/RagWidget";
import type { Property } from "@/lib/types";

const mockListings: Property[] = [
    {
        id: "1",
        title: "Test House",
        location: "DHA Phase 6",
        price: "2.5 Crore",
        bedrooms: 4,
        baths: 3,
        area: "10 Marla",
        features: ["Garden", "Security"],
        type: "House"
    },
    {
        id: "2",
        title: "Test Apartment",
        location: "Bahria Town",
        price: "1.2 Crore",
        bedrooms: 2,
        baths: 2,
        area: "5 Marla",
        features: "Pool, Gym, Parking",
        type: "Apartment"
    }
];

describe("RagWidget", () => {
    it("renders the property matches heading", () => {
        render(<RagWidget listings={mockListings} />);
        // P4: heading copy is now sentence case "Property matches"
        expect(screen.getByText("Property matches")).toBeInTheDocument();
    });

    it("renders the correct number of results", () => {
        render(<RagWidget listings={mockListings} />);
        // P4: results meta shortened from "N results found" to "N results"
        expect(screen.getByText("2 results")).toBeInTheDocument();
    });

    it("renders property details correctly", () => {
        render(<RagWidget listings={mockListings} />);
        expect(screen.getByText("Test House")).toBeInTheDocument();
        expect(screen.getByText("DHA Phase 6")).toBeInTheDocument();
        expect(screen.getByText("2.5 Crore")).toBeInTheDocument();
    });

    it("parses array features correctly", () => {
        render(<RagWidget listings={[mockListings[0]]} />);
        expect(screen.getByText("Garden")).toBeInTheDocument();
        expect(screen.getByText("Security")).toBeInTheDocument();
    });

    it("parses string features correctly", () => {
        render(<RagWidget listings={[mockListings[1]]} />);
        expect(screen.getByText("Pool")).toBeInTheDocument();
        expect(screen.getByText("Gym")).toBeInTheDocument();
    });

    it("shows '+ more' when there are more than 2 features", () => {
        render(<RagWidget listings={[mockListings[1]]} />);
        expect(screen.getByText("+1 more")).toBeInTheDocument();
    });
});
