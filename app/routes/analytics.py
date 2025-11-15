from fastapi import APIRouter, HTTPException
from app.database import supabase
from typing import Dict, List

router = APIRouter()


@router.get("/lectures/{lecture_id}")
async def get_lecture_analytics(lecture_id: str, professor_id: str):
    """Get post-lecture analytics for a professor."""
    # Verify professor owns the lecture
    lecture_result = supabase.table("lectures").select("class_id").eq("lecture_id", lecture_id).execute()
    if not lecture_result.data:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    class_id = lecture_result.data[0]["class_id"]
    class_result = supabase.table("classes").select("professor_id").eq("class_id", class_id).execute()
    
    if not class_result.data or class_result.data[0]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get attendance stats
    attendance_result = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", lecture_id).execute()
    attendance_count = attendance_result.count if attendance_result.count else 0
    
    # Get participation stats
    participation_result = supabase.table("participation_logs").select("*").eq("lecture_id", lecture_id).execute()
    participation_count = len(participation_result.data) if participation_result.data else 0
    total_participation_points = sum(p.get("points_awarded", 0) for p in participation_result.data) if participation_result.data else 0
    
    # Get question stats
    questions_result = supabase.table("questions").select("*").eq("lecture_id", lecture_id).execute()
    total_questions = len(questions_result.data) if questions_result.data else 0
    
    question_stats = []
    if questions_result.data:
        for q in questions_result.data:
            responses = supabase.table("question_responses").select("*").eq("question_id", q["question_id"]).execute()
            total_responses = len(responses.data) if responses.data else 0
            correct_count = sum(1 for r in responses.data if r.get("is_correct")) if responses.data else 0
            
            question_stats.append({
                "question_id": q["question_id"],
                "question_text": q["question_text"],
                "total_responses": total_responses,
                "correct_count": correct_count,
                "response_rate": (total_responses / attendance_count * 100) if attendance_count > 0 else 0
            })
    
    # Get AI feedback history
    feedback_result = supabase.table("ai_feedback").select("*").eq("lecture_id", lecture_id).order("timestamp").execute()
    feedback_history = feedback_result.data if feedback_result.data else []
    
    return {
        "lecture_id": lecture_id,
        "attendance_count": attendance_count,
        "participation_count": participation_count,
        "total_participation_points": total_participation_points,
        "total_questions": total_questions,
        "question_stats": question_stats,
        "feedback_history": feedback_history
    }

