from app.database import supabase
from app.utils.rank_calculator import calculate_rank
from typing import Optional
from datetime import datetime, timedelta
from app.models.student import Rank


async def update_student_points(student_id: str, points: int):
    """Update student's total points and rank."""
    # Get current profile
    profile_response = supabase.table("student_profiles").select("*").eq("student_id", student_id).execute()
    
    if profile_response.data:
        current_points = profile_response.data[0].get("total_points", 0)
        new_points = current_points + points
        new_rank = calculate_rank(new_points)
        
        supabase.table("student_profiles").update({
            "total_points": new_points,
            "rank": new_rank.value
        }).eq("student_id", student_id).execute()
    else:
        # Create new profile
        new_rank = calculate_rank(points)
        supabase.table("student_profiles").insert({
            "student_id": student_id,
            "total_points": points,
            "rank": new_rank.value,
            "total_correct_answers": 0
        }).execute()


async def update_streak(student_id: str, class_id: str, attended: bool, excused: bool = False):
    """Update student's attendance streak for a specific class."""
    if excused:
        # Excused absence doesn't break streak
        return
    
    streak_response = supabase.table("student_streaks").select("*").eq("student_id", student_id).eq("class_id", class_id).execute()
    
    if attended:
        if streak_response.data:
            current_streak = streak_response.data[0].get("current_streak", 0)
            longest_streak = streak_response.data[0].get("longest_streak", 0)
            new_streak = current_streak + 1
            
            supabase.table("student_streaks").update({
                "current_streak": new_streak,
                "longest_streak": max(longest_streak, new_streak)
            }).eq("student_id", student_id).eq("class_id", class_id).execute()
            
            # Check for attendance streak badges
            from app.services.badges import check_attendance_streak_badges
            await check_attendance_streak_badges(student_id, class_id, new_streak)
        else:
            # First attendance
            supabase.table("student_streaks").insert({
                "student_id": student_id,
                "class_id": class_id,
                "current_streak": 1,
                "longest_streak": 1
            }).execute()
            
            # Check for attendance streak badges
            from app.services.badges import check_attendance_streak_badges
            await check_attendance_streak_badges(student_id, class_id, 1)
    else:
        # Absence breaks streak
        if streak_response.data:
            supabase.table("student_streaks").update({
                "current_streak": 0
            }).eq("student_id", student_id).eq("class_id", class_id).execute()


async def increment_correct_answers(student_id: str):
    """Increment student's total correct answer count."""
    profile_response = supabase.table("student_profiles").select("*").eq("student_id", student_id).execute()
    
    if profile_response.data:
        current_count = profile_response.data[0].get("total_correct_answers", 0)
        supabase.table("student_profiles").update({
            "total_correct_answers": current_count + 1
        }).eq("student_id", student_id).execute()
    else:
        supabase.table("student_profiles").insert({
            "student_id": student_id,
            "total_points": 0,
            "rank": Rank.BRONZE.value,
            "total_correct_answers": 1
        }).execute()

