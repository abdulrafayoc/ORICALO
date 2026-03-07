/**
 * Centralized API configuration.
 * Change API_BASE here instead of hunting through 15+ hardcoded URLs.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** WebSocket base URL derived from API_BASE. */
export const WS_BASE = API_BASE.replace(/^http/, "ws");

/**
 * Thin wrapper around fetch that prepends API_BASE.
 * Keeps the same signature so callers can still use .json(), .ok, etc.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${API_BASE}${path}`, init);
}
