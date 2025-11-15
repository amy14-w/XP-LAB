from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Course(BaseModel):
    class_id: str
    professor_id: str
    name: str
    created_at: Optional[datetime] = None


class CourseCreate(BaseModel):
    name: str

