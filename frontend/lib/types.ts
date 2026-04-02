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

// Memory & Analytics types
export interface AnalyticsKPIs {
    total_calls: number;
    qualified_leads: number;
    avg_duration_seconds: number;
    total_callers: number;
    pii_redaction_rate: number;
}

export interface PopularArea {
    location: string;
    mention_count: number;
}

export interface RecentConversation {
    id: number;
    session_id: string;
    caller_phone: string | null;
    started_at: string;
    duration_seconds: number | null;
    summary: string | null;
    lead_status: string;
}

export interface AnalyticsDashboard {
    kpis: AnalyticsKPIs;
    popular_areas: PopularArea[];
    recent_conversations: RecentConversation[];
}

export interface CallerProfile {
    id: number;
    phone_number: string;
    name: string | null;
    preferred_locations: string[] | null;
    preferred_property_type: string | null;
    budget_min: number | null;
    budget_max: number | null;
    preferred_bedrooms: number | null;
    total_sessions: number;
    last_session_at: string | null;
}
