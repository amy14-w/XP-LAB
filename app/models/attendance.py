from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AttendanceLog(BaseModel):
    attendance_id: str
    student_id: str
    lecture_id: str
    checked_in_at: datetime
    excused: bool = False


class AttendanceCheckIn(BaseModel):
    lecture_code: str


class AttendanceExcuse(BaseModel):
    student_id: str
    lecture_id: str

