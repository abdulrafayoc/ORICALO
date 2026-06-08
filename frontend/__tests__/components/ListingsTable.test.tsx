import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ListingsTable } from "@/components/ListingsTable";
import { apiFetch } from "@/lib/api";

// Mock apiFetch
vi.mock("@/lib/api", () => ({
    apiFetch: vi.fn(),
}));

const mockListings = [
    {
        id: 1,
        title: "DHA House",
        location: "DHA",
        price: "5 Crore",
    },
];

describe("ListingsTable", () => {
    const mockOnEdit = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading state initially", () => {
        (apiFetch as any).mockReturnValue(new Promise(() => {}));
        render(<table><tbody><ListingsTable onEdit={mockOnEdit} /></tbody></table>);
        // P3: loading copy is now lowercase mono "loading"
        expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("renders empty state when no listings", async () => {
        (apiFetch as any).mockResolvedValue({
            ok: true,
            json: async () => [],
        });
        render(<table><tbody><ListingsTable onEdit={mockOnEdit} /></tbody></table>);
        await waitFor(() => {
            // P3: empty copy is now lowercase mono "no listings in database"
            expect(screen.getByText("no listings in database")).toBeInTheDocument();
        });
    });

    it("renders listings when fetched successfully", async () => {
        (apiFetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockListings,
        });
        render(<table><tbody><ListingsTable onEdit={mockOnEdit} /></tbody></table>);
        await waitFor(() => {
            expect(screen.getByText("DHA House")).toBeInTheDocument();
            expect(screen.getByText("5 Crore")).toBeInTheDocument();
        });
    });

    it("calls onEdit when edit button is clicked", async () => {
        (apiFetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockListings,
        });
        render(<table><tbody><ListingsTable onEdit={mockOnEdit} /></tbody></table>);
        await waitFor(() => screen.getByText("Edit"));
        fireEvent.click(screen.getByText("Edit"));
        expect(mockOnEdit).toHaveBeenCalledWith(mockListings[0]);
    });

    it("calls delete API when delete button is clicked and confirmed", async () => {
        (apiFetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockListings,
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        
        render(<table><tbody><ListingsTable onEdit={mockOnEdit} /></tbody></table>);
        await waitFor(() => screen.getByText("Delete"));
        fireEvent.click(screen.getByText("Delete"));
        
        expect(apiFetch).toHaveBeenCalledWith("/agency/listings/1", { method: 'DELETE' });
    });
});
