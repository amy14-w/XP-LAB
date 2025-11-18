from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class QuestionStatus(str, Enum):
    PENDING = "pending"
    TRIGGERED = "triggered"
    REVEALED = "revealed"


class QuestionMode(str, Enum):
    AI_FULL = "ai_full"
    MANUAL_FULL = "manual_full"
    HYBRID = "hybrid"


class Question(BaseModel):
    question_id: str
    lecture_id: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: Literal["a", "b", "c", "d"]
    ai_suggested: bool
    created_by: str  # professor_id or 'ai'
    status: QuestionStatus
    triggered_at: Optional[datetime] = None
    revealed_at: Optional[datetime] = None


class QuestionCreate(BaseModel):
    lecture_id: str
    mode: QuestionMode
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[Literal["a", "b", "c", "d"]] = None
    slide_content: Optional[str] = None  # PowerPoint/slide content for better context


class QuestionResponse(BaseModel):
    question_id: str
    selected_answer: Literal["a", "b", "c", "d"]
    response_time_ms: Optional[int] = None  # Time taken to answer in milliseconds


class QuestionResult(BaseModel):
    question_id: str
    correct_answer: Literal["a", "b", "c", "d"]
    total_responses: int
    correct_count: int
    response_rate: float

