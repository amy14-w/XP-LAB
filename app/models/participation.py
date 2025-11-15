from pydantic import BaseModel
from datetime import datetime


class ParticipationLog(BaseModel):
    participation_id: str
    student_id: str
    lecture_id: str
    points_awarded: int
    timestamp: datetime


class ParticipationCreate(BaseModel):
    student_id: str
    lecture_id: str
    points_awarded: int  # Professor specifies how many points to award

