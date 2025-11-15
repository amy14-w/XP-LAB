from app.database import supabase
from uuid import uuid4
from datetime import datetime
from typing import Dict, List, Optional


async def check_quiz_badges(student_id: str, lecture_id: str, question_id: str, is_correct: bool, response_time_ms: Optional[int] = None):
    """Check and award quiz badges after a student answers a question.
    
    Question Badges:
    - Hot Streak: 3 correct answers in a row
    - Fastest Answerer: First person to answer correctly
    - Cold Badge: 3 wrong answers in a row
    - Perfect Score: 100% correct in the lecture
    - Top 3 Badge: Finish in top 3 for the lecture (awarded at end)
    """
    badges_awarded = []
    
    # Track this answer in quiz_sessions
    quiz_session_id = str(uuid4())
    supabase.table("quiz_sessions").insert({
        "quiz_session_id": quiz_session_id,
        "lecture_id": lecture_id,
        "student_id": student_id,
        "question_id": question_id,
        "is_correct": is_correct,
        "response_time_ms": response_time_ms,
        "answered_at": datetime.utcnow().isoformat()
    }).execute()
    
    # Get student's recent answers in this lecture
    recent_answers = supabase.table("quiz_sessions").select("*").eq("student_id", student_id).eq("lecture_id", lecture_id).order("answered_at", desc=True).limit(10).execute()
    
    if not recent_answers.data:
        return badges_awarded
    
    answers = list(reversed(recent_answers.data))  # Oldest to newest
    
    # 1. Check for Fastest Answerer (first person to answer correctly)
    if is_correct and response_time_ms is not None:
        # Get all correct answers for this question, ordered by response time
        all_answers = supabase.table("quiz_sessions").select("*").eq(
            "question_id", question_id
        ).eq(
            "is_correct", True
        ).not_.is_(
            "response_time_ms", "null"
        ).order("response_time_ms", asc=True).limit(1).execute()
        
        if all_answers.data and all_answers.data[0]["student_id"] == student_id:
            badge = await award_badge(student_id, "fastest_answerer", lecture_id=lecture_id, is_temporary=True)
            if badge:
                badges_awarded.append(badge)
    
    # 2. Check for Hot Streak (3 correct in a row)
    if len(answers) >= 3:
        last_3 = answers[-3:]
        if all(a["is_correct"] for a in last_3):
            badge = await award_badge(student_id, "hot_streak", lecture_id=lecture_id, is_temporary=True)
            if badge:
                badges_awarded.append(badge)
    
    # 3. Check for Cold Badge (3 wrong in a row)
    if len(answers) >= 3:
        last_3 = answers[-3:]
        if all(not a["is_correct"] for a in last_3):
            badge = await award_badge(student_id, "cold_badge", lecture_id=lecture_id, is_temporary=True)
            if badge:
                badges_awarded.append(badge)
    
    # 4. Check for Perfect Score (100% correct in this lecture)
    all_lecture_answers = supabase.table("quiz_sessions").select("*").eq("student_id", student_id).eq("lecture_id", lecture_id).execute()
    if all_lecture_answers.data:
        total = len(all_lecture_answers.data)
        correct = sum(1 for a in all_lecture_answers.data if a["is_correct"])
        if total > 0 and correct == total:
            badge = await award_badge(student_id, "perfect_score", lecture_id=lecture_id, is_temporary=True)
            if badge:
                badges_awarded.append(badge)
    
    return badges_awarded


async def award_top_3_badges(lecture_id: str):
    """Award Top 3 badges to highest scorers in a lecture.
    
    Called at the end of a lecture session.
    """
    # Get all students' scores for this lecture
    quiz_sessions = supabase.table("quiz_sessions").select("*").eq("lecture_id", lecture_id).execute()
    
    if not quiz_sessions.data:
        return []
    
    # Calculate scores per student
    student_scores = {}
    for session in quiz_sessions.data:
        student_id = session["student_id"]
        if student_id not in student_scores:
            student_scores[student_id] = {"correct": 0, "total": 0}
        
        student_scores[student_id]["total"] += 1
        if session["is_correct"]:
            student_scores[student_id]["correct"] += 1
    
    # Calculate percentages and sort
    rankings = []
    for student_id, scores in student_scores.items():
        percentage = (scores["correct"] / scores["total"]) * 100 if scores["total"] > 0 else 0
        rankings.append({
            "student_id": student_id,
            "percentage": percentage,
            "correct": scores["correct"],
            "total": scores["total"]
        })
    
    # Sort by percentage (desc), then by total correct (desc)
    rankings.sort(key=lambda x: (x["percentage"], x["correct"]), reverse=True)
    
    # Award badges to top 3
    badges_awarded = []
    badge_types = ["top_1", "top_2", "top_3"]
    
    for i, ranking in enumerate(rankings[:3]):
        badge = await award_badge(
            ranking["student_id"],
            badge_types[i],
            lecture_id=lecture_id,
            is_temporary=True
        )
        if badge:
            badge["rank"] = i + 1
            badge["percentage"] = ranking["percentage"]
            badges_awarded.append(badge)
    
    return badges_awarded


async def check_attendance_streak_badges(student_id: str, class_id: str, current_streak: int):
    """Check and award attendance streak badges when streak updates."""
    badges_awarded = []
    
    # Define streak milestones
    streak_milestones = [3, 7, 14, 30]
    
    for milestone in streak_milestones:
        if current_streak >= milestone:
            # Check if already awarded
            badge_name = f"attendance_streak_{milestone}"
            existing = supabase.table("student_badges").select("*").eq("student_id", student_id).eq("class_id", class_id).execute()
            
            # Get badge definition
            badge_def = supabase.table("badge_definitions").select("*").eq("badge_name", badge_name).execute()
            if not badge_def.data:
                continue
            
            badge_id = badge_def.data[0]["badge_id"]
            
            # Check if already awarded for this class
            already_awarded = any(
                b.get("badge_id") == badge_id and b.get("class_id") == class_id 
                for b in (existing.data if existing.data else [])
            )
            
            if not already_awarded:
                badge = await award_badge(student_id, badge_name, class_id=class_id, is_temporary=False)
                if badge:
                    badges_awarded.append(badge)
    
    return badges_awarded


async def award_badge(student_id: str, badge_name: str, lecture_id: Optional[str] = None, class_id: Optional[str] = None, is_temporary: bool = False) -> Optional[Dict]:
    """Award a badge to a student."""
    # Get badge definition
    badge_def = supabase.table("badge_definitions").select("*").eq("badge_name", badge_name).execute()
    
    if not badge_def.data:
        return None
    
    badge_id = badge_def.data[0]["badge_id"]
    
    # Check if already awarded (for quiz badges, check per lecture; for streak, check per class)
    existing = supabase.table("student_badges").select("*").eq("student_id", student_id).eq("badge_id", badge_id)
    
    if lecture_id:
        existing = existing.eq("lecture_id", lecture_id)
    if class_id:
        existing = existing.eq("class_id", class_id)
    
    existing_result = existing.execute()
    
    if existing_result.data:
        return None  # Already awarded
    
    # Award the badge
    student_badge_id = str(uuid4())
    supabase.table("student_badges").insert({
        "student_badge_id": student_badge_id,
        "student_id": student_id,
        "badge_id": badge_id,
        "lecture_id": lecture_id,
        "class_id": class_id,
        "is_temporary": is_temporary,
        "earned_at": datetime.utcnow().isoformat()
    }).execute()
    
    return {
        "badge_id": badge_id,
        "badge_name": badge_name,
        "description": badge_def.data[0]["description"],
        "icon_name": badge_def.data[0]["icon_name"],
        "is_temporary": is_temporary
    }


async def get_student_badges(student_id: str, lecture_id: Optional[str] = None, class_id: Optional[str] = None) -> List[Dict]:
    """Get badges for a student (filtered by lecture or class if provided)."""
    query = supabase.table("student_badges").select("*, badge_definitions(*)").eq("student_id", student_id)
    
    if lecture_id:
        query = query.eq("lecture_id", lecture_id)
    if class_id:
        query = query.eq("class_id", class_id)
    
    result = query.execute()
    
    if not result.data:
        return []
    
    badges = []
    for badge in result.data:
        badge_def = badge.get("badge_definitions", {})
        badges.append({
            "badge_id": badge["badge_id"],
            "badge_name": badge_def.get("badge_name", ""),
            "description": badge_def.get("description", ""),
            "icon_name": badge_def.get("icon_name", ""),
            "earned_at": badge["earned_at"],
            "is_temporary": badge["is_temporary"]
        })
    
    return badges

