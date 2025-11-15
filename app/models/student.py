from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class Rank(str, Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class StudentProfile(BaseModel):
    student_id: str
    total_points: int
    rank: Rank
    current_streak: int  # Per course
    longest_streak: int  # Per course
    total_correct_answers: int


class StudentStreak(BaseModel):
    student_id: str
    class_id: str
    current_streak: int
    longest_streak: int

