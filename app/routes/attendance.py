from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.attendance import AttendanceCheckIn, AttendanceExcuse
from app.services.gamification import update_streak
from uuid import uuid4
from datetime import datetime

router = APIRouter()


@router.post("/check-in")
async def check_in_attendance(check_in_data: AttendanceCheckIn, student_id: str):
    """Student checks in to a lecture using the 4-digit code."""
    # Find lecture by code
    lecture_result = supabase.table("lectures").select("*").eq("lecture_code", check_in_data.lecture_code).eq("status", "active").execute()
    
    if not lecture_result.data:
        raise HTTPException(status_code=404, detail="Invalid lecture code or lecture not active")
    
    lecture = lecture_result.data[0]
    lecture_id = lecture["lecture_id"]
    class_id = lecture["class_id"]
    
    # Check if already checked in
    existing = supabase.table("attendance_logs").select("*").eq("student_id", student_id).eq("lecture_id", lecture_id).execute()
    if existing.data:
        return {"message": "Already checked in", "lecture_id": lecture_id}
    
    # Create attendance log
    attendance_id = str(uuid4())
    supabase.table("attendance_logs").insert({
        "attendance_id": attendance_id,
        "student_id": student_id,
        "lecture_id": lecture_id,
        "checked_in_at": datetime.utcnow().isoformat(),
        "excused": False
    }).execute()
    
    # Update streak
    await update_streak(student_id, class_id, attended=True)
    
    return {"message": "Attendance checked in successfully", "lecture_id": lecture_id}


@router.post("/excuse")
async def excuse_absence(excuse_data: AttendanceExcuse, professor_id: str):
    """Professor excuses a student's absence to maintain their streak."""
    # Verify professor owns the class
    lecture_result = supabase.table("lectures").select("class_id").eq("lecture_id", excuse_data.lecture_id).execute()
    if not lecture_result.data:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    class_id = lecture_result.data[0]["class_id"]
    class_result = supabase.table("classes").select("professor_id").eq("class_id", class_id).execute()
    
    if not class_result.data or class_result.data[0]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Not authorized to excuse absences for this class")
    
    # Mark as excused
    supabase.table("attendance_logs").update({
        "excused": True
    }).eq("student_id", excuse_data.student_id).eq("lecture_id", excuse_data.lecture_id).execute()
    
    # Update streak (excused doesn't break streak)
    await update_streak(excuse_data.student_id, class_id, attended=False, excused=True)
    
    return {"message": "Absence excused successfully"}

