from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.course import Course, CourseCreate
from uuid import uuid4
from typing import List

router = APIRouter()


@router.post("", response_model=Course)
async def create_class(class_data: CourseCreate, professor_id: str):
    """Create a new class."""
    class_id = str(uuid4())
    
    result = supabase.table("classes").insert({
        "class_id": class_id,
        "professor_id": professor_id,
        "name": class_data.name
    }).execute()
    
    if result.data:
        return Course(**result.data[0])
    raise HTTPException(status_code=400, detail="Failed to create class")


@router.get("")
async def get_classes(professor_id: str):
    """Get all classes for a professor."""
    result = supabase.table("classes").select("*").eq("professor_id", professor_id).execute()
    return result.data


@router.get("/{class_id}")
async def get_class(class_id: str):
    """Get class details."""
    result = supabase.table("classes").select("*").eq("class_id", class_id).execute()
    
    if result.data:
        return Course(**result.data[0])
    raise HTTPException(status_code=404, detail="Class not found")


@router.delete("/{class_id}")
async def delete_class(class_id: str, professor_id: str):
    """Delete a class and related data (only if owned by the professor)."""
    # Verify ownership
    class_result = supabase.table("classes").select("class_id, professor_id").eq("class_id", class_id).execute()
    if not class_result.data or class_result.data[0]["professor_id"] != professor_id:
        raise HTTPException(status_code=403, detail="Not authorized or class not found")

    # Gather lectures for this class
    lectures_result = supabase.table("lectures").select("lecture_id").eq("class_id", class_id).execute()
    lecture_ids: List[str] = [l["lecture_id"] for l in lectures_result.data] if lectures_result.data else []

    # Best-effort cleanup in dependency order (ignore failures to keep deletion robust)
    try:
        # For each lecture, delete dependent rows
        for lec_id in lecture_ids:
            try:
                supabase.table("attendance_logs").delete().eq("lecture_id", lec_id).execute()
            except:
                pass
            try:
                supabase.table("participation_logs").delete().eq("lecture_id", lec_id).execute()
            except:
                pass
            try:
                supabase.table("ai_feedback").delete().eq("lecture_id", lec_id).execute()
            except:
                pass
            # Questions and responses
            try:
                questions = supabase.table("questions").select("question_id").eq("lecture_id", lec_id).execute()
                if questions.data:
                    for q in questions.data:
                        try:
                            supabase.table("question_responses").delete().eq("question_id", q["question_id"]).execute()
                        except:
                            pass
                supabase.table("questions").delete().eq("lecture_id", lec_id).execute()
            except:
                pass

        # Delete quiz sessions (if tracked per lecture)
        try:
            for lec_id in lecture_ids:
                supabase.table("quiz_sessions").delete().eq("lecture_id", lec_id).execute()
        except:
            pass

        # Delete student streaks for this class
        try:
            supabase.table("student_streaks").delete().eq("class_id", class_id).execute()
        except:
            pass

        # Finally, delete lectures, then the class
        try:
            for lec_id in lecture_ids:
                supabase.table("lectures").delete().eq("lecture_id", lec_id).execute()
        except:
            pass

        delete_result = supabase.table("classes").delete().eq("class_id", class_id).execute()
        if delete_result.data is None:
            # Some clients return None on success; treat as success
            return {"message": "Class deletion requested", "class_id": class_id}
        return {"message": "Class deleted", "class_id": class_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete class: {e}")