"""
Engagement analytics for students to see which topics they struggled with
or participated in less.
"""

from typing import List, Dict, Optional
from app.database import supabase
from collections import defaultdict


async def get_student_topic_analytics(student_id: str, class_id: Optional[str] = None) -> List[Dict]:
    """Get topic-level analytics showing student engagement and performance.
    
    Args:
        student_id: ID of the student
        class_id: Optional class filter
        
    Returns:
        List of topics with performance metrics
    """
    # Build query for questions and responses
    query = """
        SELECT 
            q.topic,
            q.lecture_id,
            qs.is_correct,
            qs.response_time_ms,
            l.class_id,
            c.name as class_name
        FROM quiz_sessions qs
        JOIN questions q ON qs.question_id = q.question_id
        JOIN lectures l ON q.lecture_id = l.lecture_id
        JOIN classes c ON l.class_id = c.class_id
        WHERE qs.student_id = '{student_id}'
    """
    
    if class_id:
        query += f" AND l.class_id = '{class_id}'"
    
    # Execute query
    result = supabase.rpc('execute_sql', {'query': query}).execute()
    
    if not result.data:
        # Fallback: get data without topic if not available
        return await _get_basic_analytics(student_id, class_id)
    
    # Aggregate by topic
    topic_stats = defaultdict(lambda: {
        "total_questions": 0,
        "correct_answers": 0,
        "total_response_time": 0,
        "responses_with_time": 0,
        "class_name": "",
        "class_id": ""
    })
    
    for row in result.data:
        topic = row.get("topic", "General")
        stats = topic_stats[topic]
        
        stats["total_questions"] += 1
        stats["class_name"] = row.get("class_name", "")
        stats["class_id"] = row.get("class_id", "")
        
        if row.get("is_correct"):
            stats["correct_answers"] += 1
        
        if row.get("response_time_ms"):
            stats["total_response_time"] += row["response_time_ms"]
            stats["responses_with_time"] += 1
    
    # Calculate metrics
    analytics = []
    for topic, stats in topic_stats.items():
        accuracy = (stats["correct_answers"] / stats["total_questions"] * 100) if stats["total_questions"] > 0 else 0
        avg_response_time = (stats["total_response_time"] / stats["responses_with_time"]) if stats["responses_with_time"] > 0 else None
        
        # Determine struggle level
        struggle_level = _calculate_struggle_level(accuracy, stats["total_questions"])
        participation_level = _calculate_participation_level(stats["total_questions"])
        
        analytics.append({
            "topic": topic,
            "class_name": stats["class_name"],
            "class_id": stats["class_id"],
            "total_questions": stats["total_questions"],
            "correct_answers": stats["correct_answers"],
            "accuracy_percentage": round(accuracy, 1),
            "average_response_time_ms": round(avg_response_time) if avg_response_time else None,
            "struggle_level": struggle_level,
            "participation_level": participation_level,
            "needs_improvement": accuracy < 60 or stats["total_questions"] < 3
        })
    
    # Sort by struggle level (desc) and then by participation (asc)
    analytics.sort(key=lambda x: (-_struggle_score(x), x["total_questions"]))
    
    return analytics


async def _get_basic_analytics(student_id: str, class_id: Optional[str] = None) -> List[Dict]:
    """Fallback analytics when topic data is not available."""
    # Get quiz sessions
    query = supabase.table("quiz_sessions").select(
        "*, questions(lecture_id), lectures(class_id, classes(name))"
    ).eq("student_id", student_id)
    
    result = query.execute()
    
    if not result.data:
        return []
    
    # Group by lecture
    lecture_stats = defaultdict(lambda: {
        "total_questions": 0,
        "correct_answers": 0,
        "class_name": ""
    })
    
    for session in result.data:
        lecture_id = session.get("questions", {}).get("lecture_id")
        if not lecture_id:
            continue
            
        stats = lecture_stats[lecture_id]
        stats["total_questions"] += 1
        
        if session.get("is_correct"):
            stats["correct_answers"] += 1
    
    analytics = []
    for lecture_id, stats in lecture_stats.items():
        accuracy = (stats["correct_answers"] / stats["total_questions"] * 100) if stats["total_questions"] > 0 else 0
        
        analytics.append({
            "topic": f"Lecture {lecture_id[:8]}",
            "class_name": stats.get("class_name", "Unknown"),
            "total_questions": stats["total_questions"],
            "correct_answers": stats["correct_answers"],
            "accuracy_percentage": round(accuracy, 1),
            "struggle_level": _calculate_struggle_level(accuracy, stats["total_questions"]),
            "participation_level": _calculate_participation_level(stats["total_questions"]),
            "needs_improvement": accuracy < 60
        })
    
    return analytics


def _calculate_struggle_level(accuracy: float, total_questions: int) -> str:
    """Determine struggle level based on accuracy and participation."""
    if total_questions == 0:
        return "no_data"
    elif accuracy >= 80:
        return "excelling"
    elif accuracy >= 60:
        return "moderate"
    elif accuracy >= 40:
        return "struggling"
    else:
        return "critical"


def _calculate_participation_level(total_questions: int) -> str:
    """Determine participation level."""
    if total_questions >= 10:
        return "high"
    elif total_questions >= 5:
        return "moderate"
    elif total_questions >= 1:
        return "low"
    else:
        return "none"


def _struggle_score(analytics: Dict) -> int:
    """Calculate a numeric struggle score for sorting."""
    struggle_map = {
        "critical": 4,
        "struggling": 3,
        "moderate": 2,
        "excelling": 1,
        "no_data": 0
    }
    return struggle_map.get(analytics["struggle_level"], 0)


async def get_topic_recommendations(student_id: str, class_id: str) -> List[Dict]:
    """Get personalized topic recommendations based on performance.
    
    Returns:
        List of topics the student should focus on
    """
    analytics = await get_student_topic_analytics(student_id, class_id)
    
    # Filter topics that need improvement
    needs_work = [
        topic for topic in analytics 
        if topic["needs_improvement"] or topic["participation_level"] == "low"
    ]
    
    # Sort by priority (worst performance first)
    needs_work.sort(key=lambda x: (x["accuracy_percentage"], x["total_questions"]))
    
    recommendations = []
    for topic in needs_work[:5]:  # Top 5 topics to work on
        recommendations.append({
            "topic": topic["topic"],
            "reason": _get_recommendation_reason(topic),
            "accuracy": topic["accuracy_percentage"],
            "questions_answered": topic["total_questions"],
            "priority": "high" if topic["struggle_level"] in ["critical", "struggling"] else "medium"
        })
    
    return recommendations


def _get_recommendation_reason(topic: Dict) -> str:
    """Generate a recommendation reason based on topic performance."""
    if topic["participation_level"] == "low":
        return f"Low participation - only {topic['total_questions']} questions answered"
    elif topic["struggle_level"] == "critical":
        return f"Critical: {topic['accuracy_percentage']}% accuracy"
    elif topic["struggle_level"] == "struggling":
        return f"Struggling with {topic['accuracy_percentage']}% accuracy"
    else:
        return "Could use more practice"
