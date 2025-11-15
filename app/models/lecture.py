from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class LectureStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"


class Lecture(BaseModel):
    lecture_id: str
    class_id: str
    lecture_code: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    presentation_file_url: Optional[str] = None
    status: LectureStatus = LectureStatus.SCHEDULED


class LectureCreate(BaseModel):
    class_id: str


class LectureStart(BaseModel):
    lecture_code: str
    start_time: datetime

