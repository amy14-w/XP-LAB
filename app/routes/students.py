from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.student import StudentProfile, StudentStreak
from app.utils.rank_calculator import calculate_rank

router = APIRouter()


@router.get("/{student_id}/profile")
async def get_student_profile(student_id: str):
    """Get student's profile (points, rank, streaks, etc.)."""
    # Get profile
    profile_result = supabase.table("student_profiles").select("*").eq("student_id", student_id).execute()
    
    if not profile_result.data:
        # Create default profile
        default_profile = {
            "student_id": student_id,
            "total_points": 0,
            "rank": "bronze",
            "total_correct_answers": 0
        }
        supabase.table("student_profiles").insert(default_profile).execute()
        return StudentProfile(**default_profile, current_streak=0, longest_streak=0)
    
    profile = profile_result.data[0]
    
    # Get current streak (need class_id - for now return 0, should be per-class)
    # This is simplified - in production, you'd need to specify which class
    streak_result = supabase.table("student_streaks").select("*").eq("student_id", student_id).order("current_streak", desc=True).limit(1).execute()
    
    current_streak = streak_result.data[0]["current_streak"] if streak_result.data else 0
    longest_streak = streak_result.data[0]["longest_streak"] if streak_result.data else 0
    
    return StudentProfile(
        student_id=student_id,
        total_points=profile.get("total_points", 0),
        rank=profile.get("rank", "bronze"),
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_correct_answers=profile.get("total_correct_answers", 0)
    )


@router.get("/{student_id}/streaks")
async def get_student_streaks(student_id: str):
    """Get student's streaks per class."""
    result = supabase.table("student_streaks").select("*").eq("student_id", student_id).execute()
    return result.data if result.data else []


@router.get("/{student_id}/leaderboard")
async def get_leaderboard(class_id: str = None):
    """Get leaderboard (class-specific or global)."""
    if class_id:
        # Class-specific leaderboard
        # Get all students in class and their points
        # This is simplified - you'd join with enrollments table
        result = supabase.table("student_profiles").select("*").order("total_points", desc=True).limit(100).execute()
    else:
        # Global leaderboard
        result = supabase.table("student_profiles").select("*").order("total_points", desc=True).limit(100).execute()
    
    return result.data if result.data else []


@router.get("/{student_id}/question-stats")
async def get_question_stats(student_id: str):
    """Get student's question statistics."""
    profile_result = supabase.table("student_profiles").select("total_correct_answers").eq("student_id", student_id).execute()
    
    total_correct = profile_result.data[0]["total_correct_answers"] if profile_result.data else 0
    
    # Get total questions answered
    total_answered = supabase.table("question_responses").select("response_id", count="exact").eq("student_id", student_id).execute()
    total_count = total_answered.count if total_answered.count else 0
    
    accuracy = (total_correct / total_count * 100) if total_count > 0 else 0
    
    return {
        "total_correct": total_correct,
        "total_answered": total_count,
        "accuracy": round(accuracy, 2)
    }


@router.get("/{student_id}/badges")
async def get_student_badges_endpoint(student_id: str, lecture_id: str = None, class_id: str = None):
    """Get student's badges (filtered by lecture or class if provided)."""
    from app.services.badges import get_student_badges
    badges = await get_student_badges(student_id, lecture_id, class_id)
    return {"badges": badges}

