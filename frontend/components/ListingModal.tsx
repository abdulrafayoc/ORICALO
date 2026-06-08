"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Listing {
  id?: number;
  title?: string;
  price?: string;
  location?: string;
  city?: string;
  type?: string;
  bedrooms?: number | string;
  baths?: number | string;
  area?: string;
  features?: string[] | string;
  description?: string;
}

interface ListingModalProps {
  listing?: Listing | null;
  onClose: () => void;
  onSave: () => void;
}

const FIELD_LABEL =
  "block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2";

const INPUT_SELECT_CLASS =
  "h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ListingModal({ listing, onClose, onSave }: ListingModalProps) {
  const isEdit = !!listing;
  const [formData, setFormData] = useState({
    title: listing?.title || "",
    price: listing?.price || "",
    location: listing?.location || "",
    city: listing?.city || "Lahore",
    type: listing?.type || "House",
    bedrooms: listing?.bedrooms?.toString() || "",
    baths: listing?.baths?.toString() || "",
    area: listing?.area || "",
    features: listing?.features
      ? Array.isArray(listing.features)
        ? listing.features.join(", ")
        : listing.features
      : "",
    description: listing?.description || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const processedData = {
      ...formData,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      baths: formData.baths ? parseInt(formData.baths) : null,
      features: formData.features
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
    };

    const path = isEdit
      ? `/agency/listings/${listing!.id}`
      : "/agency/listings";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(processedData),
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit listing" : "New listing"}</DialogTitle>
          <DialogDescription>
            Property data feeds the RAG knowledge base used by the voice agent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="title" className={FIELD_LABEL}>
                Title
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="price" className={FIELD_LABEL}>
                Price
              </label>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 2.5 Crore"
              />
            </div>

            <div>
              <label htmlFor="location" className={FIELD_LABEL}>
                Location
              </label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="DHA Phase 5"
              />
            </div>

            <div>
              <label htmlFor="city" className={FIELD_LABEL}>
                City
              </label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="type" className={FIELD_LABEL}>
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={INPUT_SELECT_CLASS}
              >
                <option value="House">House</option>
                <option value="Flat">Flat</option>
                <option value="Plot">Plot</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="bedrooms" className={FIELD_LABEL}>
                  Beds
                </label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    setFormData({ ...formData, bedrooms: e.target.value })
                  }
                  mono
                />
              </div>
              <div>
                <label htmlFor="baths" className={FIELD_LABEL}>
                  Baths
                </label>
                <Input
                  id="baths"
                  type="number"
                  value={formData.baths}
                  onChange={(e) =>
                    setFormData({ ...formData, baths: e.target.value })
                  }
                  mono
                />
              </div>
              <div>
                <label htmlFor="area" className={FIELD_LABEL}>
                  Area
                </label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="10 marla"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="features" className={FIELD_LABEL}>
                Features (comma-separated)
              </label>
              <Input
                id="features"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                placeholder="garage, garden, separate entrance"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className={FIELD_LABEL}>
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save listing"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
