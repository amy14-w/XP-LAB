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
async def get_leaderboard(student_id: str, class_id: str = None):
    """Get leaderboard (class-specific or global)."""
    if class_id:
        # Class-specific leaderboard
        # Get all lectures for this class
        lectures_result = supabase.table("lectures").select("lecture_id").eq("class_id", class_id).execute()
        if not lectures_result.data:
            return []
        
        lecture_ids = [l["lecture_id"] for l in lectures_result.data]
        
        # Get all students who attended lectures in this class
        attendance_result = supabase.table("attendance_logs").select(
            "student_id"
        ).in_("lecture_id", lecture_ids).execute()
        
        if not attendance_result.data:
            return []
        
        # Get unique student IDs
        student_ids = list(set([a["student_id"] for a in attendance_result.data]))
        
        # Get profiles for these students
        profiles_result = supabase.table("student_profiles").select("*").in_("student_id", student_ids).order("total_points", desc=True).execute()
        
        # Get streaks for this class
        streaks_result = supabase.table("student_streaks").select("*").in_("student_id", student_ids).eq("class_id", class_id).execute()
        streaks_dict = {s["student_id"]: s for s in streaks_result.data if streaks_result.data}
        
        # Get user emails
        users_result = supabase.table("users").select("user_id, email").in_("user_id", student_ids).execute()
        users_dict = {u["user_id"]: u for u in users_result.data if users_result.data}
        
        # Combine data
        leaderboard = []
        for profile in profiles_result.data if profiles_result.data else []:
            student_id_lb = profile["student_id"]
            streak = streaks_dict.get(student_id_lb, {})
            user = users_dict.get(student_id_lb, {})
            
            leaderboard.append({
                "student_id": student_id_lb,
                "email": user.get("email", ""),
                "total_points": profile.get("total_points", 0),
                "rank": profile.get("rank", "bronze"),
                "current_streak": streak.get("current_streak", 0),
                "longest_streak": streak.get("longest_streak", 0)
            })
        
        # Sort by points
        leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
        return leaderboard
    else:
        # Global leaderboard (all students)
        result = supabase.table("student_profiles").select("*").order("total_points", desc=True).limit(100).execute()
        if not result.data:
            return []
        
        # Get user emails
        student_ids = [p["student_id"] for p in result.data]
        users_result = supabase.table("users").select("user_id, email").in_("user_id", student_ids).execute()
        users_dict = {u["user_id"]: u for u in users_result.data if users_result.data}
        
        # Combine with user data
        leaderboard = []
        for profile in result.data:
            user = users_dict.get(profile["student_id"], {})
            leaderboard.append({
                "student_id": profile["student_id"],
                "email": user.get("email", ""),
                "total_points": profile.get("total_points", 0),
                "rank": profile.get("rank", "bronze"),
                "current_streak": 0,  # Would need class context for streak
                "longest_streak": 0
            })
        
        return leaderboard


@router.get("/{student_id}/classes")
async def get_student_classes(student_id: str):
    """Get all classes a student has attended lectures in."""
    # Get all lectures student has attended
    attendance_result = supabase.table("attendance_logs").select(
        "lecture_id, lectures(class_id, classes(name, class_id))"
    ).eq("student_id", student_id).execute()
    
    if not attendance_result.data:
        return []
    
    # Extract unique classes
    classes_dict = {}
    for attendance in attendance_result.data:
        if attendance.get("lectures"):
            lecture = attendance["lectures"]
            if lecture.get("classes"):
                class_data = lecture["classes"]
                class_id = class_data.get("class_id")
                if class_id and class_id not in classes_dict:
                    classes_dict[class_id] = {
                        "class_id": class_id,
                        "name": class_data.get("name", "Unknown Class")
                    }
    
    return list(classes_dict.values())


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


@router.get("/class/{class_id}/students")
async def get_class_students(class_id: str, professor_id: str):
    """Get all students who have attended lectures in a class."""
    # Verify professor owns this class
    class_result = supabase.table("classes").select("*").eq("class_id", class_id).eq("professor_id", professor_id).execute()
    if not class_result.data:
        raise HTTPException(status_code=403, detail="Not authorized or class not found")
    
    # Get all lectures for this class
    lectures_result = supabase.table("lectures").select("lecture_id").eq("class_id", class_id).execute()
    if not lectures_result.data:
        return []
    
    lecture_ids = [l["lecture_id"] for l in lectures_result.data]
    
    # Get all unique students who have attended any lecture in this class
    attendance_result = supabase.table("attendance_logs").select(
        "student_id, checked_in_at, excused"
    ).in_("lecture_id", lecture_ids).execute()
    
    if not attendance_result.data:
        return []
    
    # Get unique student IDs
    unique_student_ids = list(set([a["student_id"] for a in attendance_result.data]))
    
    # Get student details and aggregate stats
    students_data = []
    for student_id in unique_student_ids:
        # Get user info
        user_result = supabase.table("users").select("user_id, email").eq("user_id", student_id).eq("role", "student").execute()
        if not user_result.data:
            continue
        
        user = user_result.data[0]
        
        # Get profile (points, rank)
        profile_result = supabase.table("student_profiles").select("*").eq("student_id", student_id).execute()
        profile = profile_result.data[0] if profile_result.data else None
        
        # Get streak for this class
        streak_result = supabase.table("student_streaks").select("*").eq("student_id", student_id).eq("class_id", class_id).execute()
        streak = streak_result.data[0] if streak_result.data else None
        
        # Get attendance rate
        attended_lectures = len([a for a in attendance_result.data if a["student_id"] == student_id])
        total_lectures = len(lecture_ids)
        attendance_rate = int((attended_lectures / total_lectures * 100)) if total_lectures > 0 else 0
        
        # Get participation (questions answered)
        participation_count = supabase.table("question_responses").select(
            "response_id", count="exact"
        ).eq("student_id", student_id).in_("lecture_id", lecture_ids).execute()
        participation = participation_count.count if participation_count.count else 0
        
        # Get average quiz score for this class
        responses_result = supabase.table("question_responses").select(
            "is_correct"
        ).eq("student_id", student_id).in_("lecture_id", lecture_ids).execute()
        
        if responses_result.data:
            total_responses = len(responses_result.data)
            correct_responses = len([r for r in responses_result.data if r["is_correct"]])
            avg_quiz_score = int((correct_responses / total_responses * 100)) if total_responses > 0 else 0
        else:
            avg_quiz_score = 0
        
        # Get badges for this class
        badges_result = supabase.table("student_badges").select(
            "badge_id, badge_definitions(badge_name, icon_name, description)"
        ).eq("student_id", student_id).eq("class_id", class_id).eq("is_temporary", False).execute()
        
        badges = []
        if badges_result.data:
            for badge in badges_result.data:
                if badge.get("badge_definitions"):
                    badge_def = badge["badge_definitions"]
                    badges.append({
                        "id": badge["badge_id"],
                        "name": badge_def.get("badge_name", "Unknown"),
                        "icon": badge_def.get("icon_name", "🏆"),
                        "description": badge_def.get("description", "")
                    })
        
        students_data.append({
            "id": student_id,
            "name": user["email"].split("@")[0],
            "email": user["email"],
            "class_id": class_id,
            "class_name": class_result.data[0]["name"],
            "points": profile.get("total_points", 0) if profile else 0,
            "rank": profile.get("rank", "bronze") if profile else "bronze",
            "streak": streak.get("current_streak", 0) if streak else 0,
            "attendance": attendance_rate,
            "participation_rate": int((participation / max(total_lectures, 1)) * 10) if participation > 0 else 0,  # Estimate
            "avg_quiz_score": avg_quiz_score,
            "badges": badges
        })
    
    return students_data


@router.get("/professor/{professor_id}/students")
async def get_professor_students(professor_id: str):
    """Get all students across all classes for a professor."""
    # Get all classes for professor
    classes_result = supabase.table("classes").select("class_id, name").eq("professor_id", professor_id).execute()
    if not classes_result.data:
        return []
    
    all_students = {}
    for class_data in classes_result.data:
        class_id = class_data["class_id"]
        class_name = class_data["name"]
        
        # Get students for this class
        try:
            class_students = await get_class_students(class_id, professor_id)
        except:
            continue
        
        for student in class_students:
            student_id = student["id"]
            if student_id not in all_students:
                # Add class info to student
                student["classes"] = [class_name]
                all_students[student_id] = student
            else:
                # Merge data
                existing = all_students[student_id]
                existing["points"] = max(existing["points"], student["points"])
                existing["badges"] = list({b["id"]: b for b in existing["badges"] + student["badges"]}.values())
                if class_name not in existing.get("classes", []):
                    existing.setdefault("classes", []).append(class_name)
    
    return list(all_students.values())


@router.get("/{student_id}/badges")
async def get_student_badges_endpoint(student_id: str, lecture_id: str = None, class_id: str = None):
    """Get student's badges (filtered by lecture or class if provided)."""
    from app.services.badges import get_student_badges
    badges = await get_student_badges(student_id, lecture_id, class_id)
    return {"badges": badges}

