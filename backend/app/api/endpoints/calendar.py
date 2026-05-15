from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, time, timedelta
from pydantic import BaseModel
import logging

from app.db.session import get_db
from app.db_tables.crm import Meeting, Lead

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class MeetingRequest(BaseModel):
    lead_id: int
    meeting_type: str  # VISIT, CALL, VIDEO
    title: Optional[str] = None
    scheduled_date: str  # YYYY-MM-DD format
    scheduled_time: str  # HH:MM format
    duration_minutes: int = 60
    notes: Optional[str] = None


class MeetingResponse(BaseModel):
    id: int
    lead_id: int
    lead_name: Optional[str]
    meeting_type: str
    title: Optional[str]
    scheduled_date: str
    scheduled_time: str
    duration_minutes: int
    status: str
    notes: Optional[str]
    created_at: str


class AvailabilitySlot(BaseModel):
    date: str
    time: str
    available: bool
    reason: Optional[str] = None


class AvailabilityResponse(BaseModel):
    date: str
    available_slots: List[AvailabilitySlot]


# Helper Functions
def parse_time(time_str: str) -> time:
    """Parse HH:MM format to time object."""
    hour, minute = map(int, time_str.split(':'))
    return time(hour=hour, minute=minute)


def time_to_minutes(t: time) -> int:
    """Convert time object to minutes since midnight."""
    return t.hour * 60 + t.minute


def minutes_to_time(minutes: int) -> time:
    """Convert minutes since midnight to time object."""
    hour = minutes // 60
    minute = minutes % 60
    return time(hour=hour, minute=minute)


def is_time_slot_available(
    db: Session,
    lead_id: int,
    date: datetime,
    start_time: time,
    duration_minutes: int,
    exclude_meeting_id: Optional[int] = None
) -> bool:
    """
    Check if a time slot is available for booking.
    
    Business hours: 9:00 AM to 10:00 PM (21:00)
    """
    # Business hours check (9am to 10pm)
    business_start = time(9, 0)
    business_end = time(21, 0)
    
    if start_time < business_start or start_time >= business_end:
        return False
    
    # Calculate end time
    start_minutes = time_to_minutes(start_time)
    end_minutes = start_minutes + duration_minutes
    end_time = minutes_to_time(end_minutes)
    
    if end_time > business_end:
        return False
    
    # Check for overlapping meetings
    start_datetime = datetime.combine(date.date(), start_time)
    end_datetime = datetime.combine(date.date(), end_time)
    
    query = db.query(Meeting).filter(
        Meeting.scheduled_date == date.date(),
        Meeting.status == "SCHEDULED"
    )
    
    if exclude_meeting_id:
        query = query.filter(Meeting.id != exclude_meeting_id)
    
    existing_meetings = query.all()
    
    for meeting in existing_meetings:
        meeting_start = datetime.combine(meeting.scheduled_date, parse_time(meeting.scheduled_time))
        meeting_end = meeting_start + timedelta(minutes=meeting.duration_minutes)
        
        # Check for overlap
        if not (end_datetime <= meeting_start or start_datetime >= meeting_end):
            return False
    
    return True


def get_available_slots(
    db: Session,
    date: datetime,
    lead_id: Optional[int] = None,
    duration_minutes: int = 60,
    slot_interval: int = 30
) -> List[AvailabilitySlot]:
    """
    Get available time slots for a given date.
    
    Business hours: 9:00 AM to 10:00 PM
    Default slot interval: 30 minutes
    """
    business_start = time(9, 0)
    business_end = time(21, 0)
    
    available_slots = []
    current_time = business_start
    
    while current_time < business_end:
        end_time_minutes = time_to_minutes(current_time) + duration_minutes
        if end_time_minutes > time_to_minutes(business_end):
            break
        
        is_available = is_time_slot_available(
            db,
            lead_id or 0,  # lead_id can be None for general availability check
            date,
            current_time,
            duration_minutes
        )
        
        slot = AvailabilitySlot(
            date=date.strftime("%Y-%m-%d"),
            time=current_time.strftime("%H:%M"),
            available=is_available,
            reason=None if is_available else "Slot already booked or outside business hours"
        )
        
        available_slots.append(slot)
        
        # Move to next slot
        current_minutes = time_to_minutes(current_time) + slot_interval
        current_time = minutes_to_time(current_minutes)
    
    return available_slots


# API Endpoints

@router.get("/calendar/availability/{date}", response_model=AvailabilityResponse)
async def check_availability(
    date: str,
    lead_id: Optional[int] = None,
    duration_minutes: int = 60,
    db: Session = Depends(get_db)
):
    """
    Check available time slots for a given date.
    
    Date format: YYYY-MM-DD
    Business hours: 9:00 AM to 10:00 PM
    Default duration: 60 minutes
    """
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
        date_obj = datetime.combine(parsed_date, time.min)
        
        available_slots = get_available_slots(
            db,
            date_obj,
            lead_id,
            duration_minutes
        )
        
        return AvailabilityResponse(
            date=date,
            available_slots=available_slots
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calendar/book", response_model=MeetingResponse)
async def book_meeting(
    meeting_request: MeetingRequest,
    db: Session = Depends(get_db)
):
    """
    Book a new meeting.
    
    Validates:
    - Lead exists
    - Time slot is available (9am-10pm business hours)
    - No overlapping meetings
    """
    try:
        # Check if lead exists
        lead = db.query(Lead).filter(Lead.id == meeting_request.lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Parse date and time
        scheduled_date = datetime.strptime(meeting_request.scheduled_date, "%Y-%m-%d").date()
        scheduled_time = parse_time(meeting_request.scheduled_time)
        date_obj = datetime.combine(scheduled_date, time.min)
        
        # Check availability
        if not is_time_slot_available(
            db,
            meeting_request.lead_id,
            date_obj,
            scheduled_time,
            meeting_request.duration_minutes
        ):
            raise HTTPException(
                status_code=400,
                detail="Time slot is not available. Business hours are 9:00 AM to 10:00 PM."
            )
        
        # Create meeting
        new_meeting = Meeting(
            lead_id=meeting_request.lead_id,
            meeting_type=meeting_request.meeting_type.upper(),
            title=meeting_request.title or f"{meeting_request.meeting_type} - {lead.name}",
            scheduled_date=scheduled_date,
            scheduled_time=meeting_request.scheduled_time,
            duration_minutes=meeting_request.duration_minutes,
            notes=meeting_request.notes,
            status="SCHEDULED"
        )
        
        db.add(new_meeting)
        db.commit()
        db.refresh(new_meeting)
        
        return MeetingResponse(
            id=new_meeting.id,
            lead_id=new_meeting.lead_id,
            lead_name=lead.name,
            meeting_type=new_meeting.meeting_type,
            title=new_meeting.title,
            scheduled_date=new_meeting.scheduled_date.strftime("%Y-%m-%d"),
            scheduled_time=new_meeting.scheduled_time,
            duration_minutes=new_meeting.duration_minutes,
            status=new_meeting.status,
            notes=new_meeting.notes,
            created_at=new_meeting.created_at.isoformat()
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format. Use YYYY-MM-DD and HH:MM")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error booking meeting: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/meetings", response_model=List[MeetingResponse])
async def get_meetings(
    lead_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get meetings with optional filtering.
    
    Filters:
    - lead_id: Filter by specific lead
    - status: Filter by status (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW)
    - start_date: Filter meetings from this date onwards (YYYY-MM-DD)
    - end_date: Filter meetings up to this date (YYYY-MM-DD)
    """
    try:
        query = db.query(Meeting).join(Lead)
        
        if lead_id:
            query = query.filter(Meeting.lead_id == lead_id)
        
        if status:
            query = query.filter(Meeting.status == status.upper())
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Meeting.scheduled_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Meeting.scheduled_date <= end_date_obj)
        
        meetings = query.order_by(Meeting.scheduled_date, Meeting.scheduled_time).all()
        
        return [
            MeetingResponse(
                id=m.id,
                lead_id=m.lead_id,
                lead_name=m.lead.name if m.lead else None,
                meeting_type=m.meeting_type,
                title=m.title,
                scheduled_date=m.scheduled_date.strftime("%Y-%m-%d"),
                scheduled_time=m.scheduled_time,
                duration_minutes=m.duration_minutes,
                status=m.status,
                notes=m.notes,
                created_at=m.created_at.isoformat()
            )
            for m in meetings
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Error getting meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/calendar/meetings/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    meeting_request: MeetingRequest,
    db: Session = Depends(get_db)
):
    """
    Update an existing meeting.
    
    Validates:
    - Meeting exists
    - Lead exists
    - New time slot is available (if changing date/time)
    """
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check if lead exists
        lead = db.query(Lead).filter(Lead.id == meeting_request.lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Parse date and time
        scheduled_date = datetime.strptime(meeting_request.scheduled_date, "%Y-%m-%d").date()
        scheduled_time = parse_time(meeting_request.scheduled_time)
        date_obj = datetime.combine(scheduled_date, time.min)
        
        # Check availability if date/time changed
        if (meeting.scheduled_date != scheduled_date or 
            meeting.scheduled_time != meeting_request.scheduled_time):
            if not is_time_slot_available(
                db,
                meeting_request.lead_id,
                date_obj,
                scheduled_time,
                meeting_request.duration_minutes,
                exclude_meeting_id=meeting_id
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Time slot is not available. Business hours are 9:00 AM to 10:00 PM."
                )
        
        # Update meeting
        meeting.lead_id = meeting_request.lead_id
        meeting.meeting_type = meeting_request.meeting_type.upper()
        meeting.title = meeting_request.title or f"{meeting_request.meeting_type} - {lead.name}"
        meeting.scheduled_date = scheduled_date
        meeting.scheduled_time = meeting_request.scheduled_time
        meeting.duration_minutes = meeting_request.duration_minutes
        meeting.notes = meeting_request.notes
        
        db.commit()
        db.refresh(meeting)
        
        return MeetingResponse(
            id=meeting.id,
            lead_id=meeting.lead_id,
            lead_name=lead.name,
            meeting_type=meeting.meeting_type,
            title=meeting.title,
            scheduled_date=meeting.scheduled_date.strftime("%Y-%m-%d"),
            scheduled_time=meeting.scheduled_time,
            duration_minutes=meeting.duration_minutes,
            status=meeting.status,
            notes=meeting.notes,
            created_at=meeting.created_at.isoformat()
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format. Use YYYY-MM-DD and HH:MM")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating meeting: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/calendar/meetings/{meeting_id}/status")
async def update_meeting_status(
    meeting_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """
    Update meeting status.
    
    Valid statuses: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    """
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        valid_statuses = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]
        if status.upper() not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Valid statuses: {', '.join(valid_statuses)}"
            )
        
        meeting.status = status.upper()
        db.commit()
        
        return {"status": "success", "message": "Meeting status updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating meeting status: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/calendar/meetings/{meeting_id}")
async def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a meeting.
    """
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        db.delete(meeting)
        db.commit()
        
        return {"status": "success", "message": "Meeting deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meeting: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
