from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.course import Course, CourseCreate
from uuid import uuid4

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

