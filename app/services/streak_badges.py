"""
Course-specific streak badge progression system.

Each course can have custom visual badges that evolve as streaks increase.
Examples:
- Economics: Stack of money that grows
- Biology: Plant that grows
- Computer Science: Code complexity increasing
- Mathematics: Geometric patterns becoming more complex
"""

from typing import Dict, List
from app.database import supabase


# Course-specific badge themes
COURSE_BADGE_THEMES = {
    "economics": {
        "name": "Money Stack",
        "levels": [
            {"min_streak": 1, "icon": "💵", "name": "Single Bill", "tier": 1},
            {"min_streak": 3, "icon": "💵💵", "name": "Double Bill", "tier": 2},
            {"min_streak": 7, "icon": "💰", "name": "Money Bag", "tier": 3},
            {"min_streak": 14, "icon": "💰💰", "name": "Double Bag", "tier": 4},
            {"min_streak": 21, "icon": "💎", "name": "Diamond Hands", "tier": 5},
            {"min_streak": 30, "icon": "👑💎", "name": "Wealth King", "tier": 6},
        ]
    },
    "biology": {
        "name": "Growing Plant",
        "levels": [
            {"min_streak": 1, "icon": "🌱", "name": "Seedling", "tier": 1},
            {"min_streak": 3, "icon": "🌿", "name": "Sprout", "tier": 2},
            {"min_streak": 7, "icon": "🪴", "name": "Young Plant", "tier": 3},
            {"min_streak": 14, "icon": "🌳", "name": "Tree", "tier": 4},
            {"min_streak": 21, "icon": "🌳🌳", "name": "Grove", "tier": 5},
            {"min_streak": 30, "icon": "🌲🌲🌲", "name": "Forest", "tier": 6},
        ]
    },
    "computer_science": {
        "name": "Code Master",
        "levels": [
            {"min_streak": 1, "icon": "💻", "name": "Hello World", "tier": 1},
            {"min_streak": 3, "icon": "⌨️", "name": "Typing Speed", "tier": 2},
            {"min_streak": 7, "icon": "🖥️", "name": "Full Stack", "tier": 3},
            {"min_streak": 14, "icon": "🚀", "name": "Deploy Master", "tier": 4},
            {"min_streak": 21, "icon": "🤖", "name": "AI Wizard", "tier": 5},
            {"min_streak": 30, "icon": "👨‍💻👑", "name": "Code Royalty", "tier": 6},
        ]
    },
    "mathematics": {
        "name": "Geometric Growth",
        "levels": [
            {"min_streak": 1, "icon": "📏", "name": "Line", "tier": 1},
            {"min_streak": 3, "icon": "📐", "name": "Triangle", "tier": 2},
            {"min_streak": 7, "icon": "⬜", "name": "Square", "tier": 3},
            {"min_streak": 14, "icon": "⬡", "name": "Hexagon", "tier": 4},
            {"min_streak": 21, "icon": "🔷", "name": "Diamond", "tier": 5},
            {"min_streak": 30, "icon": "✨🔷✨", "name": "Sacred Geometry", "tier": 6},
        ]
    },
    "default": {
        "name": "Flame Streak",
        "levels": [
            {"min_streak": 1, "icon": "🔥", "name": "Spark", "tier": 1},
            {"min_streak": 3, "icon": "🔥🔥", "name": "Flame", "tier": 2},
            {"min_streak": 7, "icon": "🔥🔥🔥", "name": "Blaze", "tier": 3},
            {"min_streak": 14, "icon": "🔥💪", "name": "Inferno", "tier": 4},
            {"min_streak": 21, "icon": "⚡🔥", "name": "Lightning Blaze", "tier": 5},
            {"min_streak": 30, "icon": "👑🔥👑", "name": "Eternal Flame", "tier": 6},
        ]
    }
}


def get_course_theme(course_name: str) -> str:
    """Determine the badge theme based on course name.
    
    Args:
        course_name: Name of the course
        
    Returns:
        Theme key for the course
    """
    course_lower = course_name.lower()
    
    for theme_key in COURSE_BADGE_THEMES.keys():
        if theme_key in course_lower:
            return theme_key
    
    return "default"


def get_streak_badge_level(streak_days: int, course_name: str) -> Dict:
    """Get the current streak badge level for a student.
    
    Args:
        streak_days: Current streak count
        course_name: Name of the course
        
    Returns:
        Badge level information
    """
    theme_key = get_course_theme(course_name)
    theme = COURSE_BADGE_THEMES[theme_key]
    
    # Find the highest level the student has achieved
    current_level = theme["levels"][0]  # Default to first level
    
    for level in theme["levels"]:
        if streak_days >= level["min_streak"]:
            current_level = level
        else:
            break
    
    return {
        "theme_name": theme["name"],
        "icon": current_level["icon"],
        "level_name": current_level["name"],
        "tier": current_level["tier"],
        "streak_days": streak_days,
        "next_tier": _get_next_tier(theme["levels"], current_level["tier"])
    }


def _get_next_tier(levels: List[Dict], current_tier: int) -> Dict:
    """Get information about the next tier."""
    for level in levels:
        if level["tier"] > current_tier:
            return {
                "icon": level["icon"],
                "name": level["name"],
                "required_streak": level["min_streak"]
            }
    
    return None  # Already at max tier


async def get_student_streak_badge(student_id: str, class_id: str) -> Dict:
    """Get a student's current streak badge for a specific class.
    
    Returns:
        Complete badge information with visuals
    """
    # Get class info
    class_result = supabase.table("classes").select("*").eq("class_id", class_id).execute()
    
    if not class_result.data:
        return None
    
    course_name = class_result.data[0]["name"]
    
    # Get student's streak
    streak_result = supabase.table("student_streaks").select("*").eq(
        "student_id", student_id
    ).eq(
        "class_id", class_id
    ).execute()
    
    current_streak = 0
    if streak_result.data:
        current_streak = streak_result.data[0].get("current_streak", 0)
    
    # Get badge level
    badge_info = get_streak_badge_level(current_streak, course_name)
    
    return {
        "course_name": course_name,
        "class_id": class_id,
        **badge_info
    }


async def get_all_student_streak_badges(student_id: str) -> List[Dict]:
    """Get all streak badges for a student across all their classes.
    
    Returns:
        List of badge information for each class
    """
    # Get all classes the student is enrolled in
    enrollment_result = supabase.table("class_enrollments").select(
        "class_id"
    ).eq("student_id", student_id).execute()
    
    if not enrollment_result.data:
        return []
    
    badges = []
    for enrollment in enrollment_result.data:
        badge = await get_student_streak_badge(student_id, enrollment["class_id"])
        if badge:
            badges.append(badge)
    
    return badges
