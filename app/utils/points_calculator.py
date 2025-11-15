"""
Points calculation system for XP Lab.

Default Points:
- Attendance: 15pts
- In-class questions: 25pts per question (x/qst = 25pts)
- Perfect score bonus: +10pts (if all questions answered correctly)
- Missed attendance penalty: -10pts (-5pts per class missed)
- Teacher bonus: Variable (set by teacher)

Streak Multipliers (applied to total points at end of class):
- Day 2-8: +2pts
- Day 9-15: +3pts
- Day 16-22: +4pts
- Day 23-32: +5pts
"""

from typing import Optional


class PointsConfig:
    """Default points configuration. Can be overridden by teacher settings."""
    
    # Attendance
    ATTENDANCE_POINTS = 15
    MISSED_CLASS_PENALTY = -10
    PENALTY_PER_ABSENCE = -5
    
    # Questions
    POINTS_PER_QUESTION = 25
    PERFECT_SCORE_BONUS = 10
    
    # Teacher bonus
    MIN_TEACHER_BONUS = 0
    MAX_TEACHER_BONUS = 50


def calculate_attendance_points(attended: bool, excused: bool = False) -> int:
    """Calculate points for attendance."""
    if excused:
        return 0  # No penalty for excused absence
    return PointsConfig.ATTENDANCE_POINTS if attended else PointsConfig.MISSED_CLASS_PENALTY


def calculate_question_points(total_questions: int, correct_answers: int) -> int:
    """Calculate points for in-class questions.
    
    Args:
        total_questions: Total number of questions in the lecture
        correct_answers: Number of questions answered correctly
        
    Returns:
        Total points earned from questions
    """
    if total_questions == 0:
        return 0
    
    # Base points: (correct/total) * 25pts per question
    base_points = (correct_answers / total_questions) * PointsConfig.POINTS_PER_QUESTION * total_questions
    
    # Bonus for perfect score
    bonus = PointsConfig.PERFECT_SCORE_BONUS if correct_answers == total_questions else 0
    
    return int(base_points + bonus)


def calculate_streak_bonus(streak_days: int) -> int:
    """Calculate bonus points based on current streak.
    
    Streak multipliers:
    - Day 2-8: +2pts
    - Day 9-15: +3pts
    - Day 16-22: +4pts
    - Day 23-32: +5pts
    - Day 33+: +5pts (caps at +5)
    
    Args:
        streak_days: Current streak count in days
        
    Returns:
        Bonus points to add to total
    """
    if streak_days < 2:
        return 0
    elif streak_days <= 8:
        return 2
    elif streak_days <= 15:
        return 3
    elif streak_days <= 22:
        return 4
    else:  # 23+
        return 5


def calculate_teacher_bonus(points: int, reason: str = "") -> int:
    """Calculate teacher-awarded bonus points.
    
    Teachers can award bonus points for creative or exceptional answers.
    
    Args:
        points: Bonus points to award (0-50)
        reason: Reason for awarding bonus
        
    Returns:
        Validated bonus points
    """
    return max(PointsConfig.MIN_TEACHER_BONUS, min(points, PointsConfig.MAX_TEACHER_BONUS))


def calculate_lecture_total(
    attended: bool,
    total_questions: int,
    correct_answers: int,
    current_streak: int,
    teacher_bonus: int = 0,
    excused: bool = False
) -> dict:
    """Calculate total points for a lecture session.
    
    Returns:
        Dictionary with breakdown of points
    """
    attendance_pts = calculate_attendance_points(attended, excused)
    question_pts = calculate_question_points(total_questions, correct_answers)
    streak_pts = calculate_streak_bonus(current_streak) if attended else 0
    bonus_pts = teacher_bonus
    
    total = attendance_pts + question_pts + streak_pts + bonus_pts
    
    return {
        "attendance_points": attendance_pts,
        "question_points": question_pts,
        "streak_bonus": streak_pts,
        "teacher_bonus": bonus_pts,
        "total_points": total,
        "breakdown": {
            "attended": attended,
            "excused": excused,
            "questions_correct": correct_answers,
            "questions_total": total_questions,
            "current_streak": current_streak
        }
    }
