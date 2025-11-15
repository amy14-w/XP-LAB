from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.participation import ParticipationLog, ParticipationCreate
from app.services.gamification import update_student_points
from uuid import uuid4
from datetime import datetime

router = APIRouter()


@router.post("/log")
async def log_participation(participation_data: ParticipationCreate, professor_id: str):
    """Professor logs student participation."""
    # Verify professor owns the class
    lecture_result = supabase.table("lectures").select("class_id").eq("lecture_id", participation_data.lecture_id).execute()
    if not lecture_result.data:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    class_id = lecture_result.data[0]["class_id"]
    class_result = supabase.table("classes").select("professor_id").eq("class_id", class_id).execute()
    
    if not class_result.data or class_result.data[0]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Not authorized to log participation for this class")
    
    # Create participation log
    participation_id = str(uuid4())
    points_awarded = participation_data.points_awarded
    
    supabase.table("participation_logs").insert({
        "participation_id": participation_id,
        "student_id": participation_data.student_id,
        "lecture_id": participation_data.lecture_id,
        "points_awarded": points_awarded,
        "timestamp": datetime.utcnow().isoformat()
    }).execute()
    
    # Update student points
    await update_student_points(participation_data.student_id, points_awarded)
    
    return {"message": "Participation logged", "points_awarded": points_awarded}


@router.get("/{student_id}")
async def get_participation_history(student_id: str):
    """Get student's participation history."""
    result = supabase.table("participation_logs").select("*").eq("student_id", student_id).order("timestamp", desc=True).execute()
    return result.data if result.data else []

