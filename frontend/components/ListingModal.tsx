"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface ListingModalProps {
    listing?: any;
    onClose: () => void;
    onSave: () => void;
}

/**
 * Modal form for creating or editing a property listing.
 * Separated from rag/page.tsx for single-responsibility.
 */
export function ListingModal({ listing, onClose, onSave }: ListingModalProps) {
    const isEdit = !!listing;
    const [formData, setFormData] = useState({
        title: listing?.title || "",
        price: listing?.price || "",
        location: listing?.location || "",
        city: listing?.city || "Lahore",
        type: listing?.type || "House",
        bedrooms: listing?.bedrooms || "",
        baths: listing?.baths || "",
        area: listing?.area || "",
        features: listing?.features ? (Array.isArray(listing.features) ? listing.features.join(", ") : listing.features) : "",
        description: listing?.description || ""
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const processedData = {
            ...formData,
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
            baths: formData.baths ? parseInt(formData.baths) : null,
            features: formData.features.split(",").map((s: string) => s.trim()).filter((s: string) => s)
        };

        const path = isEdit
            ? `/agency/listings/${listing.id}`
            : "/agency/listings";

        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await apiFetch(path, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(processedData)
            });
            if (res.ok) {
                onSave();
            } else {
                alert("Failed to save listing");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving listing");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                    <h3 className="text-xl font-bold text-white">{isEdit ? "Edit Listing" : "New Listing"}</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Title</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Price</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="e.g. 2.5 Crore"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Location</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">City</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Type</label>
                            <select className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="House">House</option>
                                <option value="Flat">Flat</option>
                                <option value="Plot">Plot</option>
                                <option value="Commercial">Commercial</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2 col-span-2">
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Beds</label>
                                <input type="number" className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Baths</label>
                                <input type="number" className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.baths} onChange={e => setFormData({ ...formData, baths: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-1">Area</label>
                                <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} placeholder="e.g. 10 Marla"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Features (comma separated)</label>
                            <input className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-1">Description</label>
                            <textarea className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none h-24"
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : "Save Listing"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
