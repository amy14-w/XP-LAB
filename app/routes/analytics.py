from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from typing import Dict, List
from datetime import datetime
import os

router = APIRouter()


@router.get("/lectures/{lecture_id}")
async def get_lecture_analytics(lecture_id: str, professor_id: str = Query(...)):
    """Get post-lecture analytics for a professor."""
    try:
        # Verify professor owns the lecture
        lecture_result = supabase.table("lectures").select("*").eq("lecture_id", lecture_id).execute()
        if not lecture_result.data:
            print(f"❌ Lecture {lecture_id} not found in database")
            raise HTTPException(status_code=404, detail="Lecture not found")
        
        lecture = lecture_result.data[0]
        class_id = lecture["class_id"]
        
        class_result = supabase.table("classes").select("*").eq("class_id", class_id).execute()
        
        if not class_result.data:
            print(f"❌ Class {class_id} not found for lecture {lecture_id}")
            raise HTTPException(status_code=404, detail="Class not found")
        
        if class_result.data[0]["professor_id"] != professor_id:
            print(f"❌ Unauthorized: Professor {professor_id} does not own lecture {lecture_id}")
            raise HTTPException(status_code=403, detail="Not authorized")
        
        class_data = class_result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in analytics endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    # Get lecture details
    start_time = lecture.get("start_time")
    end_time = lecture.get("end_time")
    
    # Helper function to parse datetime
    def parse_datetime(dt_str):
        if not dt_str:
            return None
        try:
            # Handle ISO format with 'Z' or '+00:00'
            if isinstance(dt_str, str):
                if dt_str.endswith('Z'):
                    dt_str = dt_str.replace('Z', '+00:00')
                return datetime.fromisoformat(dt_str)
            return dt_str
        except Exception as e:
            print(f"⚠ Error parsing datetime {dt_str}: {e}")
            return None
    
    # Calculate duration
    duration_minutes = 0
    if start_time and end_time:
        try:
            start_dt = parse_datetime(start_time)
            end_dt = parse_datetime(end_time)
            if start_dt and end_dt:
                duration_seconds = (end_dt - start_dt).total_seconds()
                duration_minutes = int(duration_seconds / 60)
        except Exception as e:
            print(f"⚠ Error calculating duration: {e}")
            duration_minutes = 0
    
    # Format date
    if start_time:
        try:
            start_dt = parse_datetime(start_time)
            if start_dt:
                formatted_date = start_dt.strftime("%B %d, %Y")
            else:
                formatted_date = "N/A"
        except Exception as e:
            print(f"⚠ Error formatting date: {e}")
            formatted_date = "N/A"
    else:
        formatted_date = "N/A"
    
    # Get topic from class name (or use a default)
    topic = class_data.get("name", "Lecture")
    
    # Get attendance stats
    attendance_result = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", lecture_id).execute()
    attendance_count = attendance_result.count if attendance_result.count else 0
    
    # Get total students in class (use attendance as proxy, or check student_streaks which links students to classes)
    # Since there's no explicit enrollment table, we'll use the max of attendance or students who have streaks/records
    total_students_result = supabase.table("student_streaks").select("student_id", count="exact").eq("class_id", class_id).execute()
    total_students_from_streaks = total_students_result.count if total_students_result.count else 0
    
    # Use attendance count or streaks count, whichever is higher (or at least attendance count)
    total_students = max(attendance_count, total_students_from_streaks) if total_students_from_streaks > 0 else attendance_count
    
    # Get participation stats
    participation_result = supabase.table("participation_logs").select("*").eq("lecture_id", lecture_id).execute()
    participation_count = len(participation_result.data) if participation_result.data else 0
    total_participation_points = sum(p.get("points_awarded", 0) for p in participation_result.data) if participation_result.data else 0
    
    # Calculate participation rate
    participation_rate = (participation_count / attendance_count * 100) if attendance_count > 0 else 0
    
    # Get sentiment history from pipeline (if still in memory)
    sentiment_history = []
    engagement_timeline = []
    engagement_score = 75  # Default
    try:
        from app.websockets.audio_handler import voice_pipelines, lecture_talk_time
        if lecture_id in voice_pipelines:
            pipeline = voice_pipelines[lecture_id]
            if hasattr(pipeline, 'sentiment_history') and pipeline.sentiment_history:
                sentiment_history = pipeline.sentiment_history
                
                # Build engagement timeline from sentiment history
                if sentiment_history:
                    # Calculate average engagement score from sentiment scores
                    sentiment_scores = [s.get('sentiment_score', 0.5) for s in sentiment_history if s.get('sentiment_score') is not None]
                    if sentiment_scores:
                        # Convert sentiment scores (0-1) to engagement percentage (0-100)
                        # Positive sentiment (0.5-1.0) maps to 50-100%
                        # Negative sentiment (0-0.5) maps to 0-50%
                        engagement_scores = [min(max((score - 0.5) * 200, 0), 100) for score in sentiment_scores]
                        engagement_score = int(sum(engagement_scores) / len(engagement_scores))
                    
                    # Build timeline data points (every checkpoint, using seconds for granularity)
                    if start_time:
                        try:
                            start_dt = parse_datetime(start_time)
                            if start_dt:
                                for sentiment in sentiment_history:
                                    if 'timestamp' in sentiment:
                                        try:
                                            sent_time = parse_datetime(sentiment['timestamp'])
                                            if sent_time:
                                                # Use seconds from start for more granular timeline
                                                seconds_from_start = int((sent_time - start_dt).total_seconds())
                                                
                                                # Calculate engagement from sentiment score
                                                sent_score = sentiment.get('sentiment_score', 0.5)
                                                engagement_value = min(max((sent_score - 0.5) * 200, 0), 100)
                                                
                                                engagement_timeline.append({
                                                    "time": str(seconds_from_start),
                                                    "engagement": round(engagement_value, 1)
                                                })
                                        except Exception as e:
                                            print(f"⚠ Error processing sentiment timestamp: {e}")
                                            pass
                        except Exception as e:
                            print(f"⚠ Error parsing start_time: {e}")
                            pass
    except Exception as e:
        print(f"⚠ Could not get sentiment history from pipeline: {e}")
        import traceback
        traceback.print_exc()
    
    # If no timeline data, generate default based on duration (every 15 seconds)
    if not engagement_timeline and duration_minutes > 0:
        total_seconds = duration_minutes * 60
        for i in range(0, total_seconds + 1, 15):  # Every 15 seconds
            engagement_timeline.append({
                "time": str(i),
                "engagement": engagement_score  # Use average
            })
    
    # Get talk time ratio
    professor_talk_time_seconds = 0
    try:
        from app.websockets.audio_handler import lecture_talk_time
        professor_talk_time_seconds = lecture_talk_time.get(lecture_id, 0.0)
    except:
        pass
    
    # Get question periods (time when questions were active = student talk time)
    # Questions are triggered and then revealed, the time between is student interaction time
    student_talk_time_seconds = 0
    questions_from_db = 0
    questions_result = supabase.table("questions").select("triggered_at, revealed_at").eq("lecture_id", lecture_id).eq("status", "revealed").execute()
    if questions_result.data:
        for question in questions_result.data:
            triggered_at = question.get("triggered_at")
            revealed_at = question.get("revealed_at")
            if triggered_at and revealed_at:
                try:
                    trigger_dt = parse_datetime(triggered_at)
                    reveal_dt = parse_datetime(revealed_at)
                    if trigger_dt and reveal_dt:
                        question_duration = (reveal_dt - trigger_dt).total_seconds()
                        student_talk_time_seconds += max(0, question_duration)
                        questions_from_db += 1
                except Exception as e:
                    print(f"⚠ Error calculating question duration: {e}")
                    pass
    
    # Also detect questions in transcript (when professor asks questions that weren't tracked in DB)
    # Look for question patterns in transcript and estimate time for questions not in database
    transcript = lecture.get("transcript", "")
    if transcript:
        # Count question marks in transcript
        total_question_marks = transcript.count("?")
        # Estimate that each question mark represents ~5 seconds of student interaction time
        # But only count questions that weren't already tracked in the database
        # (We assume each DB question corresponds to 1 question mark, so subtract those)
        untracked_questions = max(0, total_question_marks - questions_from_db)
        estimated_question_time = untracked_questions * 5  # 5 seconds per untracked question
        student_talk_time_seconds += estimated_question_time
    
    # Calculate talk time ratio
    if duration_minutes > 0:
        total_seconds = duration_minutes * 60
        
        # Professor talk time = total audio time recorded (when professor was speaking)
        # Student talk time = question periods (when questions were active) + estimated question time from transcript
        # Note: Question periods overlap with professor talk time, but we count them as student interaction time
        
        if total_seconds > 0:
            # Calculate base ratios
            professor_base_ratio = min((professor_talk_time_seconds / total_seconds) * 100, 100)
            student_base_ratio = min((student_talk_time_seconds / total_seconds) * 100, 100)
            
            # If student time (questions) exceeds professor time, adjust
            # This can happen if many questions were asked
            if student_base_ratio > professor_base_ratio:
                # Normalize: student time takes priority for question periods
                # Remaining time goes to professor
                professor_ratio = max(0, 100 - student_base_ratio)
                student_ratio = student_base_ratio
            else:
                # Normal case: professor talks more than questions
                professor_ratio = professor_base_ratio
                student_ratio = student_base_ratio
                
                # Remaining time (silence/other) goes to professor
                remaining = 100 - (professor_ratio + student_ratio)
                if remaining > 0:
                    professor_ratio += remaining
            
            # Ensure ratios are valid
            professor_ratio = max(0, min(100, professor_ratio))
            student_ratio = max(0, min(100, student_ratio))
            
            # Final normalization to ensure they add up to 100%
            total_ratio = professor_ratio + student_ratio
            if total_ratio > 0:
                professor_ratio = (professor_ratio / total_ratio) * 100
                student_ratio = (student_ratio / total_ratio) * 100
        else:
            professor_ratio = 68
            student_ratio = 32
    else:
        professor_ratio = 68
        student_ratio = 32
    
    talk_time_distribution = [
        {"name": "Professor", "value": round(professor_ratio, 0), "color": "#06B6D4"},
        {"name": "Students", "value": round(student_ratio, 0), "color": "#10B981"}
    ]
    
    # Get question stats
    questions_result = supabase.table("questions").select("*").eq("lecture_id", lecture_id).execute()
    total_questions = len(questions_result.data) if questions_result.data else 0
    
    question_stats = []
    if questions_result.data:
        for q in questions_result.data:
            responses = supabase.table("question_responses").select("*").eq("question_id", q["question_id"]).execute()
            total_responses = len(responses.data) if responses.data else 0
            correct_count = sum(1 for r in responses.data if r.get("is_correct")) if responses.data else 0
            
            question_stats.append({
                "question_id": q["question_id"],
                "question_text": q["question_text"],
                "total_responses": total_responses,
                "correct_count": correct_count,
                "response_rate": (total_responses / attendance_count * 100) if attendance_count > 0 else 0
            })
    
    # Get AI feedback history
    feedback_result = supabase.table("ai_feedback").select("*").eq("lecture_id", lecture_id).order("timestamp").execute()
    feedback_history = feedback_result.data if feedback_result.data else []
    
    try:
        return {
            "lecture_id": lecture_id,
            "topic": topic,
            "date": formatted_date,
            "duration_minutes": duration_minutes,
            "duration_formatted": f"{duration_minutes} min",
            "attendance_count": attendance_count,
            "total_students": total_students,
            "engagement_score": engagement_score,
            "participation_rate": round(participation_rate, 1),
            "participation_count": participation_count,
            "total_participation_points": total_participation_points,
            "talk_time_ratio": {
                "professor": round(professor_ratio, 0),
                "students": round(student_ratio, 0)
            },
            "talk_time_distribution": talk_time_distribution,
            "engagement_timeline": engagement_timeline,
            "total_questions": total_questions,
            "question_stats": question_stats,
            "feedback_history": feedback_history
        }
    except Exception as e:
        print(f"❌ Error building analytics response: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")

