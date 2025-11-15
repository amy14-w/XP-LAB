"""
API routes for engagement analytics.
"""

from fastapi import APIRouter
from typing import Optional
from app.services.engagement_analytics import (
    get_student_topic_analytics,
    get_topic_recommendations
)

router = APIRouter()


@router.get("/{student_id}/topics")
async def get_topic_analytics(student_id: str, class_id: Optional[str] = None):
    """Get student's topic-level analytics showing engagement and performance.
    
    Shows which topics the student struggled with or participated in less.
    """
    analytics = await get_student_topic_analytics(student_id, class_id)
    return {"analytics": analytics}


@router.get("/{student_id}/recommendations")
async def get_recommendations(student_id: str, class_id: str):
    """Get personalized topic recommendations for improvement."""
    recommendations = await get_topic_recommendations(student_id, class_id)
    return {"recommendations": recommendations}
