from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    PROFESSOR = "professor"
    STUDENT = "student"


class User(BaseModel):
    user_id: str
    email: str
    role: UserRole
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole


class UserLogin(BaseModel):
    email: str
    password: str

