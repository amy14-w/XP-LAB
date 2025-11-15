"""
Teacher custom settings for point values and ranking thresholds.

Teachers can customize:
- Ranking point thresholds
- Attendance point values
- Question point values
- Penalties
"""

from typing import Dict, Optional
from app.database import supabase
from pydantic import BaseModel


class TeacherSettings(BaseModel):
    """Teacher-customizable settings for a class."""
    class_id: str
    
    # Ranking thresholds
    bronze_threshold: int = 0
    silver_threshold: int = 150
    gold_threshold: int = 400
    platinum_threshold: int = 820
    diamond_threshold: int = 1250
    master_threshold: int = 1500
    
    # Attendance points
    attendance_points: int = 15
    missed_class_penalty: int = -10
    
    # Question points
    points_per_question: int = 25
    perfect_score_bonus: int = 10
    
    # Teacher bonus limits
    max_teacher_bonus: int = 50


async def get_teacher_settings(class_id: str) -> TeacherSettings:
    """Get teacher settings for a class. Returns defaults if not customized.
    
    Args:
        class_id: ID of the class
        
    Returns:
        TeacherSettings object
    """
    result = supabase.table("teacher_settings").select("*").eq("class_id", class_id).execute()
    
    if result.data:
        return TeacherSettings(**result.data[0])
    else:
        # Return defaults
        return TeacherSettings(class_id=class_id)


async def update_teacher_settings(
    class_id: str,
    professor_id: str,
    settings: Dict
) -> Dict:
    """Update teacher settings for a class.
    
    Args:
        class_id: ID of the class
        professor_id: ID of the professor (for authorization)
        settings: Dictionary of settings to update
        
    Returns:
        Result with success status
    """
    # Verify professor owns this class
    class_result = supabase.table("classes").select("*").eq(
        "class_id", class_id
    ).eq(
        "professor_id", professor_id
    ).execute()
    
    if not class_result.data:
        return {
            "success": False,
            "message": "Unauthorized: You do not own this class"
        }
    
    # Validate settings
    try:
        validated_settings = TeacherSettings(class_id=class_id, **settings)
    except Exception as e:
        return {
            "success": False,
            "message": f"Invalid settings: {str(e)}"
        }
    
    # Check if settings exist
    existing = supabase.table("teacher_settings").select("*").eq("class_id", class_id).execute()
    
    settings_dict = validated_settings.dict()
    
    if existing.data:
        # Update existing
        supabase.table("teacher_settings").update(settings_dict).eq("class_id", class_id).execute()
    else:
        # Create new
        supabase.table("teacher_settings").insert(settings_dict).execute()
    
    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": settings_dict
    }


async def calculate_rank_with_custom_settings(
    class_id: str,
    total_points: int
) -> str:
    """Calculate rank using teacher's custom thresholds.
    
    Args:
        class_id: ID of the class
        total_points: Student's total points
        
    Returns:
        Rank name (bronze, silver, gold, etc.)
    """
    settings = await get_teacher_settings(class_id)
    
    if total_points >= settings.master_threshold:
        return "master"
    elif total_points >= settings.diamond_threshold:
        return "diamond"
    elif total_points >= settings.platinum_threshold:
        return "platinum"
    elif total_points >= settings.gold_threshold:
        return "gold"
    elif total_points >= settings.silver_threshold:
        return "silver"
    else:
        return "bronze"


async def calculate_points_with_custom_settings(
    class_id: str,
    attended: bool,
    total_questions: int,
    correct_answers: int,
    teacher_bonus: int = 0
) -> Dict:
    """Calculate points using teacher's custom values.
    
    Args:
        class_id: ID of the class
        attended: Whether student attended
        total_questions: Total questions in lecture
        correct_answers: Questions answered correctly
        teacher_bonus: Bonus points from teacher
        
    Returns:
        Points breakdown
    """
    settings = await get_teacher_settings(class_id)
    
    # Attendance points
    attendance_pts = settings.attendance_points if attended else settings.missed_class_penalty
    
    # Question points
    if total_questions > 0:
        base_question_pts = (correct_answers / total_questions) * settings.points_per_question * total_questions
        perfect_bonus = settings.perfect_score_bonus if correct_answers == total_questions else 0
        question_pts = int(base_question_pts + perfect_bonus)
    else:
        question_pts = 0
    
    # Validate teacher bonus
    bonus_pts = min(teacher_bonus, settings.max_teacher_bonus)
    
    total = attendance_pts + question_pts + bonus_pts
    
    return {
        "attendance_points": attendance_pts,
        "question_points": question_pts,
        "teacher_bonus": bonus_pts,
        "total_points": total,
        "settings_used": {
            "attendance_value": settings.attendance_points,
            "points_per_question": settings.points_per_question,
            "perfect_bonus": settings.perfect_score_bonus if correct_answers == total_questions else 0
        }
    }


async def reset_to_defaults(class_id: str, professor_id: str) -> Dict:
    """Reset class settings to system defaults.
    
    Args:
        class_id: ID of the class
        professor_id: ID of the professor (for authorization)
        
    Returns:
        Result with success status
    """
    # Verify professor owns this class
    class_result = supabase.table("classes").select("*").eq(
        "class_id", class_id
    ).eq(
        "professor_id", professor_id
    ).execute()
    
    if not class_result.data:
        return {
            "success": False,
            "message": "Unauthorized: You do not own this class"
        }
    
    # Delete custom settings
    supabase.table("teacher_settings").delete().eq("class_id", class_id).execute()
    
    return {
        "success": True,
        "message": "Settings reset to defaults",
        "settings": TeacherSettings(class_id=class_id).dict()
    }
