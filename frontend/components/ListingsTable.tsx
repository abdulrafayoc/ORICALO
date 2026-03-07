"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface ListingsTableProps {
    onEdit: (item: any) => void;
}

/**
 * Fetches and renders the agency listings table rows.
 * Separated from rag/page.tsx for single-responsibility and reusability.
 */
export function ListingsTable({ onEdit }: ListingsTableProps) {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchListings = async () => {
        try {
            const res = await apiFetch("/agency/listings");
            if (res.ok) {
                const data = await res.json();
                setListings(data);
            }
        } catch (error) {
            console.error("Failed to fetch listings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        try {
            const res = await apiFetch(`/agency/listings/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchListings();
            }
        } catch (error) {
            console.error("Failed to delete listing:", error);
        }
    }

    useEffect(() => {
        fetchListings();
    }, []);

    if (loading) return <tr><td colSpan={5} className="px-6 py-8 text-center">Loading listings...</td></tr>;
    if (listings.length === 0) return <tr><td colSpan={5} className="px-6 py-8 text-center">No listings found in database.</td></tr>;

    return (
        <>
            {listings.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{item.id}</td>
                    <td className="px-6 py-4 text-white font-medium">{item.title}</td>
                    <td className="px-6 py-4">{item.location}</td>
                    <td className="px-6 py-4 font-mono text-emerald-500">{item.price}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                            onClick={() => onEdit(item)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium hover:underline"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium hover:underline"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            ))}
        </>
    );
}
