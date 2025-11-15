from fastapi import APIRouter, HTTPException, UploadFile, File
from app.database import supabase
from app.models.lecture import Lecture, LectureCreate, LectureStatus
from app.utils.lecture_code import generate_lecture_code
from app.config import settings
from uuid import uuid4
from datetime import datetime
from typing import Optional
import aiofiles
import os

router = APIRouter()


@router.post("", response_model=Lecture)
async def create_lecture(lecture_data: LectureCreate):
    """Create a new lecture."""
    lecture_id = str(uuid4())
    
    result = supabase.table("lectures").insert({
        "lecture_id": lecture_id,
        "class_id": lecture_data.class_id,
        "status": LectureStatus.SCHEDULED.value
    }).execute()
    
    if result.data:
        return Lecture(**result.data[0])
    raise HTTPException(status_code=400, detail="Failed to create lecture")


@router.post("/{lecture_id}/start")
async def start_lecture(lecture_id: str):
    """Start a lecture and generate a 4-digit code."""
    lecture_code = generate_lecture_code()
    start_time = datetime.utcnow()
    
    # Ensure code is unique
    while True:
        existing = supabase.table("lectures").select("lecture_id").eq("lecture_code", lecture_code).eq("status", LectureStatus.ACTIVE.value).execute()
        if not existing.data:
            break
        lecture_code = generate_lecture_code()
    
    result = supabase.table("lectures").update({
        "lecture_code": lecture_code,
        "start_time": start_time.isoformat(),
        "status": LectureStatus.ACTIVE.value
    }).eq("lecture_id", lecture_id).execute()
    
    if result.data:
        return {"lecture_code": lecture_code, "start_time": start_time.isoformat()}
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.post("/{lecture_id}/end")
async def end_lecture(lecture_id: str):
    """End a lecture."""
    end_time = datetime.utcnow()
    
    result = supabase.table("lectures").update({
        "end_time": end_time.isoformat(),
        "status": LectureStatus.ENDED.value
    }).eq("lecture_id", lecture_id).execute()
    
    if result.data:
        return {"message": "Lecture ended", "end_time": end_time.isoformat()}
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.get("/{lecture_id}")
async def get_lecture(lecture_id: str):
    """Get lecture details."""
    result = supabase.table("lectures").select("*").eq("lecture_id", lecture_id).execute()
    
    if result.data:
        return Lecture(**result.data[0])
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.post("/{lecture_id}/upload-presentation")
async def upload_presentation(lecture_id: str, file: UploadFile = File(...)):
    """Upload presentation file to Supabase Storage."""
    # Read file content
    content = await file.read()
    
    # Upload to Supabase Storage
    file_path = f"presentations/{lecture_id}/{file.filename}"
    
    try:
        # Supabase storage upload
        storage_response = supabase.storage.from_("presentations").upload(
            file_path,
            content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        url_response = supabase.storage.from_("presentations").get_public_url(file_path)
        
        # Update lecture with file URL
        supabase.table("lectures").update({
            "presentation_file_url": url_response
        }).eq("lecture_id", lecture_id).execute()
        
        return {"message": "File uploaded successfully", "url": url_response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

