"""
Streak management system with streak savers.

Streak Savers:
- Students can restore their streak once per month
- Teachers can reset streaks at any time
"""

from datetime import datetime, timedelta
from app.database import supabase
from typing import Optional


async def can_use_streak_saver(student_id: str, class_id: str) -> bool:
    """Check if student can use their monthly streak saver.
    
    Returns:
        True if streak saver is available, False otherwise
    """
    # Get the last time student used streak saver for this class
    result = supabase.table("streak_savers").select("*").eq(
        "student_id", student_id
    ).eq(
        "class_id", class_id
    ).order("used_at", desc=True).limit(1).execute()
    
    if not result.data:
        return True  # Never used before
    
    last_used = datetime.fromisoformat(result.data[0]["used_at"].replace('Z', '+00:00'))
    now = datetime.utcnow()
    
    # Check if 30 days have passed
    days_since_last_use = (now - last_used).days
    return days_since_last_use >= 30


async def use_streak_saver(student_id: str, class_id: str) -> dict:
    """Use student's monthly streak saver to restore their streak.
    
    Returns:
        Result with success status and message
    """
    # Check if student can use streak saver
    can_use = await can_use_streak_saver(student_id, class_id)
    
    if not can_use:
        # Get last usage date
        result = supabase.table("streak_savers").select("*").eq(
            "student_id", student_id
        ).eq(
            "class_id", class_id
        ).order("used_at", desc=True).limit(1).execute()
        
        last_used = datetime.fromisoformat(result.data[0]["used_at"].replace('Z', '+00:00'))
        next_available = last_used + timedelta(days=30)
        days_remaining = (next_available - datetime.utcnow()).days
        
        return {
            "success": False,
            "message": f"Streak saver not available. Next available in {days_remaining} days.",
            "next_available": next_available.isoformat()
        }
    
    # Get student's longest streak
    streak_result = supabase.table("student_streaks").select("*").eq(
        "student_id", student_id
    ).eq(
        "class_id", class_id
    ).execute()
    
    if not streak_result.data:
        return {
            "success": False,
            "message": "No streak history found for this class."
        }
    
    longest_streak = streak_result.data[0].get("longest_streak", 0)
    
    # Restore streak to longest streak value
    supabase.table("student_streaks").update({
        "current_streak": longest_streak
    }).eq("student_id", student_id).eq("class_id", class_id).execute()
    
    # Record streak saver usage
    supabase.table("streak_savers").insert({
        "student_id": student_id,
        "class_id": class_id,
        "used_at": datetime.utcnow().isoformat(),
        "restored_to": longest_streak
    }).execute()
    
    return {
        "success": True,
        "message": f"Streak restored to {longest_streak} days!",
        "restored_streak": longest_streak
    }


async def teacher_reset_streak(
    teacher_id: str,
    student_id: str,
    class_id: str,
    new_streak: Optional[int] = None
) -> dict:
    """Teacher can reset a student's streak.
    
    Args:
        teacher_id: ID of the teacher performing the reset
        student_id: ID of the student
        class_id: ID of the class
        new_streak: Optional new streak value. If None, restores to longest streak.
        
    Returns:
        Result with success status and message
    """
    # Verify teacher owns this class
    class_result = supabase.table("classes").select("*").eq(
        "class_id", class_id
    ).eq(
        "professor_id", teacher_id
    ).execute()
    
    if not class_result.data:
        return {
            "success": False,
            "message": "Teacher does not have permission for this class."
        }
    
    # Get student's current streak info
    streak_result = supabase.table("student_streaks").select("*").eq(
        "student_id", student_id
    ).eq(
        "class_id", class_id
    ).execute()
    
    if not streak_result.data:
        return {
            "success": False,
            "message": "No streak found for this student in this class."
        }
    
    # Determine new streak value
    if new_streak is None:
        new_streak = streak_result.data[0].get("longest_streak", 0)
    
    # Update streak
    supabase.table("student_streaks").update({
        "current_streak": new_streak
    }).eq("student_id", student_id).eq("class_id", class_id).execute()
    
    # Log the teacher reset
    supabase.table("streak_resets").insert({
        "student_id": student_id,
        "class_id": class_id,
        "teacher_id": teacher_id,
        "reset_at": datetime.utcnow().isoformat(),
        "new_streak": new_streak,
        "reason": "teacher_reset"
    }).execute()
    
    return {
        "success": True,
        "message": f"Streak reset to {new_streak} days by teacher.",
        "new_streak": new_streak
    }


async def get_streak_info(student_id: str, class_id: str) -> dict:
    """Get complete streak information for a student in a class.
    
    Returns:
        Dictionary with streak info and saver availability
    """
    # Get current streak
    streak_result = supabase.table("student_streaks").select("*").eq(
        "student_id", student_id
    ).eq(
        "class_id", class_id
    ).execute()
    
    current_streak = 0
    longest_streak = 0
    
    if streak_result.data:
        current_streak = streak_result.data[0].get("current_streak", 0)
        longest_streak = streak_result.data[0].get("longest_streak", 0)
    
    # Check streak saver availability
    can_use_saver = await can_use_streak_saver(student_id, class_id)
    
    # Get streak bonus points
    from app.utils.points_calculator import calculate_streak_bonus
    streak_bonus = calculate_streak_bonus(current_streak)
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "streak_bonus_points": streak_bonus,
        "can_use_streak_saver": can_use_saver,
        "streak_tier": _get_streak_tier(current_streak)
    }


def _get_streak_tier(streak_days: int) -> str:
    """Get the tier name for display purposes."""
    if streak_days < 2:
        return "starter"
    elif streak_days <= 8:
        return "bronze"
    elif streak_days <= 15:
        return "silver"
    elif streak_days <= 22:
        return "gold"
    else:
        return "platinum"
