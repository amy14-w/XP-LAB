"""
API routes for streak management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.utils.streak_manager import (
    can_use_streak_saver,
    use_streak_saver,
    teacher_reset_streak,
    get_streak_info
)
from app.services.streak_badges import (
    get_student_streak_badge,
    get_all_student_streak_badges
)

router = APIRouter()


class StreakSaverRequest(BaseModel):
    student_id: str
    class_id: str


class TeacherResetRequest(BaseModel):
    student_id: str
    class_id: str
    new_streak: Optional[int] = None


@router.post("/use-saver")
async def use_saver(request: StreakSaverRequest):
    """Student uses their monthly streak saver."""
    result = await use_streak_saver(request.student_id, request.class_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/can-use-saver/{student_id}/{class_id}")
async def check_saver_availability(student_id: str, class_id: str):
    """Check if student can use their streak saver."""
    can_use = await can_use_streak_saver(student_id, class_id)
    return {"can_use": can_use}


@router.post("/teacher-reset")
async def reset_streak(request: TeacherResetRequest, teacher_id: str):
    """Teacher resets a student's streak."""
    result = await teacher_reset_streak(
        teacher_id,
        request.student_id,
        request.class_id,
        request.new_streak
    )
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result


@router.get("/info/{student_id}/{class_id}")
async def get_info(student_id: str, class_id: str):
    """Get complete streak information for a student."""
    info = await get_streak_info(student_id, class_id)
    return info


@router.get("/badge/{student_id}/{class_id}")
async def get_streak_badge(student_id: str, class_id: str):
    """Get student's course-specific streak badge."""
    badge = await get_student_streak_badge(student_id, class_id)
    
    if not badge:
        raise HTTPException(status_code=404, detail="No streak badge found")
    
    return badge


@router.get("/badges/{student_id}")
async def get_all_badges(student_id: str):
    """Get all streak badges for a student across all classes."""
    badges = await get_all_student_streak_badges(student_id)
    return {"badges": badges}
