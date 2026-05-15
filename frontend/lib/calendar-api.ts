import { apiFetch } from "./api";

export interface Meeting {
  id: number;
  lead_id: number;
  lead_name?: string;
  meeting_type: "VISIT" | "CALL" | "VIDEO";
  title?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  created_at: string;
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string;
}

export interface AvailabilityResponse {
  date: string;
  available_slots: AvailabilitySlot[];
}

export interface MeetingRequest {
  lead_id: number;
  meeting_type: "VISIT" | "CALL" | "VIDEO";
  title?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  notes?: string;
}

export const calendarApi = {
  // Check availability for a specific date
  checkAvailability: async (date: string, leadId?: number): Promise<AvailabilityResponse> => {
    const params = new URLSearchParams();
    if (leadId) params.append("lead_id", leadId.toString());
    
    const response = await apiFetch(`/calendar/availability/${date}?${params.toString()}`);
    return response.json();
  },

  // Book a new meeting
  bookMeeting: async (meeting: MeetingRequest): Promise<Meeting> => {
    const response = await apiFetch("/calendar/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meeting),
    });
    return response.json();
  },

  // Get meetings with optional filters
  getMeetings: async (filters?: {
    lead_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Meeting[]> => {
    const params = new URLSearchParams();
    if (filters?.lead_id) params.append("lead_id", filters.lead_id.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const queryString = params.toString();
    const url = queryString ? `/calendar/meetings?${queryString}` : "/calendar/meetings";
    
    const response = await apiFetch(url);
    return response.json();
  },

  // Update an existing meeting
  updateMeeting: async (meetingId: number, meeting: MeetingRequest): Promise<Meeting> => {
    const response = await apiFetch(`/calendar/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meeting),
    });
    return response.json();
  },

  // Update meeting status
  updateMeetingStatus: async (meetingId: number, status: string): Promise<{ status: string; message: string }> => {
    const response = await apiFetch(`/calendar/meetings/${meetingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return response.json();
  },

  // Delete a meeting
  deleteMeeting: async (meetingId: number): Promise<{ status: string; message: string }> => {
    const response = await apiFetch(`/calendar/meetings/${meetingId}`, {
      method: "DELETE",
    });
    return response.json();
  },
};
