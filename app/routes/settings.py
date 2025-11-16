"""
API routes for teacher settings.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from app.services.teacher_settings import (
    get_teacher_settings,
    update_teacher_settings,
    reset_to_defaults,
    calculate_points_with_custom_settings
)

router = APIRouter()


class SettingsUpdate(BaseModel):
    # Ranking thresholds
    bronze_threshold: Optional[int] = None
    silver_threshold: Optional[int] = None
    gold_threshold: Optional[int] = None
    platinum_threshold: Optional[int] = None
    diamond_threshold: Optional[int] = None
    master_threshold: Optional[int] = None
    
    # Attendance points
    attendance_points: Optional[int] = None
    missed_class_penalty: Optional[int] = None
    
    # Question points
    points_per_question: Optional[int] = None
    perfect_score_bonus: Optional[int] = None
    
    # Teacher bonus limits
    max_teacher_bonus: Optional[int] = None
    
    # Question timing
    question_suggestion_interval: Optional[int] = None  # Minutes of talk time between suggestions


@router.get("/{class_id}")
async def get_settings(class_id: str):
    """Get teacher settings for a class."""
    settings = await get_teacher_settings(class_id)
    return settings.dict()


@router.put("/{class_id}")
async def update_settings(class_id: str, professor_id: str, settings: SettingsUpdate):
    """Update teacher settings for a class."""
    # Filter out None values
    settings_dict = {k: v for k, v in settings.dict().items() if v is not None}
    
    result = await update_teacher_settings(class_id, professor_id, settings_dict)
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result


@router.post("/{class_id}/reset")
async def reset_settings(class_id: str, professor_id: str):
    """Reset class settings to system defaults."""
    result = await reset_to_defaults(class_id, professor_id)
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result
