/**
 * Shared TypeScript interfaces for the Oricalo frontend.
 * Single source of truth — avoids duplicating these across page components.
 */

export interface Agent {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    system_prompt?: string;
    is_active?: boolean;
}

export interface Property {
    id: string;
    title: string;
    location: string;
    price: string;
    image?: string;
    description?: string;
    type?: string;
    bedrooms?: number;
    baths?: number;
    area?: string;
    features?: string[] | string;
}
