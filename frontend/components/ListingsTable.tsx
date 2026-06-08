"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Listing {
  id: number;
  title: string;
  location: string;
  price: string;
}

interface ListingsTableProps {
  onEdit: (item: Listing) => void;
}

/**
 * Fetches and renders agency listing rows.
 * Returns <tr> fragments — the parent provides the <table> + <thead> + <tbody>.
 */
export function ListingsTable({ onEdit }: ListingsTableProps) {
  const [listings, setListings] = useState<Listing[]>([]);
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
      const res = await apiFetch(`/agency/listings/${id}`, { method: "DELETE" });
      if (res.ok) fetchListings();
    } catch (error) {
      console.error("Failed to delete listing:", error);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  if (loading) {
    return (
      <tr>
        <td
          colSpan={5}
          className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
        >
          loading
        </td>
      </tr>
    );
  }
  if (listings.length === 0) {
    return (
      <tr>
        <td
          colSpan={5}
          className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
        >
          no listings in database
        </td>
      </tr>
    );
  }

  return (
    <>
      {listings.map((item) => (
        <tr
          key={item.id}
          className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
        >
          <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
            {item.id}
          </td>
          <td className="px-3 py-2.5 text-foreground">{item.title}</td>
          <td className="px-3 py-2.5 text-muted-foreground">{item.location}</td>
          <td className="px-3 py-2.5 font-serif text-accent">{item.price}</td>
          <td className="px-3 py-2.5 text-right">
            <div className="inline-flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground hover:text-accent transition-colors"
              >
                Edit
              </button>
              <span className="font-mono text-[10px] text-muted-foreground">·</span>
              <button
                onClick={() => handleDelete(item.id)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-destructive transition-colors"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
