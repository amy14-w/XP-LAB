from fastapi import APIRouter, HTTPException, Query
from app.database import supabase
from typing import Dict, List
from datetime import datetime, timezone
try:
    # Python 3.9+
    from zoneinfo import ZoneInfo
    EASTERN_TZ = ZoneInfo("America/New_York")
except Exception:
    EASTERN_TZ = None
import os

router = APIRouter()


# Module-level datetime parser (used by multiple endpoints)
def _parse_dt_eastern(dt_str):
    if not dt_str:
        return None
    try:
        raw = dt_str
        if isinstance(raw, str) and raw.endswith('Z'):
            raw = raw.replace('Z', '+00:00')
        dt = datetime.fromisoformat(raw) if isinstance(raw, str) else raw
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        try:
            from zoneinfo import ZoneInfo
            dt = dt.astimezone(ZoneInfo("America/New_York"))
        except Exception:
            pass
        return dt
    except Exception:
        return None

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
    def parse_datetime(dt_str, to_eastern: bool = True):
        """
        Parse an ISO datetime string to an aware datetime.
        - Treat 'Z' as UTC.
        - If no timezone info present, assume UTC.
        - Optionally convert to US/Eastern for consistent display/processing.
        """
        if not dt_str:
            return None
        try:
            if isinstance(dt_str, str):
                raw = dt_str
                # Normalize Z to +00:00
                if raw.endswith('Z'):
                    raw = raw.replace('Z', '+00:00')
                dt = datetime.fromisoformat(raw)
            else:
                dt = dt_str
            # Ensure tz-aware; default to UTC if naive
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            # Convert to Eastern if requested and available
            if to_eastern and EASTERN_TZ is not None:
                dt = dt.astimezone(EASTERN_TZ)
            return dt
        except Exception as e:
            print(f"⚠ Error parsing datetime {dt_str}: {e}")
            return None
    
    # Calculate duration - try multiple methods for reliability
    duration_minutes = 0
    
    # First, try to get duration_minutes directly from lectures table (saved during end_lecture)
    try:
        lecture_check = supabase.table("lectures").select("duration_minutes, start_time, end_time").eq("lecture_id", lecture_id).execute()
        print(f"🔍 Analytics duration lookup: lecture_check.data={lecture_check.data}")
        if lecture_check.data:
            db_duration = lecture_check.data[0].get("duration_minutes")
            print(f"🔍 DB duration_minutes value: {db_duration} (type: {type(db_duration)})")
            if db_duration is not None:
                duration_minutes = int(db_duration) if db_duration is not None else 0
                if duration_minutes > 0:
                    print(f"✓ Using duration_minutes from lectures table: {duration_minutes} minutes")
                else:
                    print(f"⚠ duration_minutes in DB is 0 or None for lecture {lecture_id}")
            else:
                print(f"⚠ duration_minutes is None in database for lecture {lecture_id}")
        else:
            print(f"⚠ Could not find lecture {lecture_id} in database")
    except Exception as e:
        print(f"⚠ Could not get duration_minutes from lectures table: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback: try to get from lecture_reports table
    if duration_minutes == 0:
        try:
            report_check = supabase.table("lecture_reports").select("duration_minutes").eq("lecture_id", lecture_id).execute()
            if report_check.data and report_check.data[0].get("duration_minutes") is not None:
                duration_minutes = int(report_check.data[0].get("duration_minutes", 0))
                if duration_minutes > 0:
                    print(f"✓ Using duration_minutes from lecture_reports table: {duration_minutes} minutes")
        except Exception as e:
            print(f"⚠ Could not get duration_minutes from lecture_reports table: {e}")
    
    # Last resort: calculate from start_time and end_time
    if duration_minutes == 0 and start_time and end_time:
        try:
            start_dt = parse_datetime(start_time)
            end_dt = parse_datetime(end_time)
            if start_dt and end_dt:
                duration_seconds = (end_dt - start_dt).total_seconds()
                duration_minutes = max(0, int(duration_seconds / 60))
                if duration_minutes > 0:
                    print(f"✓ Calculated duration from start_time/end_time: {duration_minutes} minutes ({duration_seconds:.1f} seconds)")
                else:
                    print(f"⚠ Calculated duration is 0 or negative: {duration_seconds:.1f} seconds")
        except Exception as e:
            print(f"⚠ Error calculating duration from start_time/end_time: {e}")
            import traceback
            traceback.print_exc()
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
                    # Confidence gating: only include checkpoints with sufficient confidence (>= 0.5)
                    filtered = [
                        s for s in sentiment_history
                        if s.get('sentiment_score') is not None and s.get('confidence', 1.0) >= 0.5
                    ]
                    
                    # Calculate engagement score using corrected mapping:
                    # Map sentiment_score from [-1, 1] to engagement [0, 100]
                    # engagement = ((score + 1) / 2) * 100
                    if filtered:
                        mapped_engagement = [
                            min(max(((s['sentiment_score'] + 1.0) / 2.0) * 100.0, 0.0), 100.0)
                            for s in filtered
                        ]
                        
                        # Use median aggregation for the headline engagement score for robustness
                        sorted_vals = sorted(mapped_engagement)
                        n = len(sorted_vals)
                        if n % 2 == 1:
                            median_val = sorted_vals[n // 2]
                        else:
                            median_val = (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2.0
                        engagement_score = int(round(median_val))
                    
                    # Build timeline data points (every checkpoint, using seconds for granularity)
                    if start_time:
                        try:
                            start_dt = parse_datetime(start_time)
                            if start_dt:
                                for sentiment in sentiment_history:
                                    # Skip low-confidence points in the timeline as well
                                    if 'timestamp' in sentiment and sentiment.get('confidence', 1.0) >= 0.5:
                                        try:
                                            sent_time = parse_datetime(sentiment['timestamp'])
                                            if sent_time:
                                                # Use seconds from start for more granular timeline
                                                seconds_from_start = int((sent_time - start_dt).total_seconds())
                                                
                                                # Calculate engagement from sentiment score using corrected mapping
                                                sent_score = sentiment.get('sentiment_score', 0.0)
                                                engagement_value = min(max(((sent_score + 1.0) / 2.0) * 100.0, 0.0), 100.0)
                                                
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
                    
                    # Blend in delivery dynamics from fast metrics (pace, pitch variation, filler)
                    try:
                        if lecture_id in voice_pipelines:
                            fm_history = getattr(voice_pipelines[lecture_id], 'fast_metrics_history', [])
                            if fm_history and start_time:
                                start_dt = parse_datetime(start_time)
                                # Build a quick lookup of delivery scores by second
                                delivery_by_sec = {}
                                for m in fm_history:
                                    ts = m.get('timestamp')
                                    if not ts or not start_dt:
                                        continue
                                    try:
                                        m_time = parse_datetime(ts)
                                        sec = int((m_time - start_dt).total_seconds())
                                        # Compute delivery score 0-100
                                        # Clarity: inverse of filler_rate
                                        filler_rate = m.get('filler', {}).get('filler_rate', 0.0)
                                        clarity = min(max((1.0 - float(filler_rate)) * 100.0, 0.0), 100.0)
                                        # Pace: same normalization as frontend
                                        wpm = int(m.get('wpm', {}).get('wpm', 0) or 0)
                                        if wpm == 0:
                                            pace = 0.0
                                        elif wpm < 120:
                                            pace = (wpm / 120.0) * 70.0
                                        elif wpm <= 180:
                                            pace = 70.0 + ((wpm - 120.0) / 60.0) * 30.0
                                        else:
                                            pace = max(100.0 - ((wpm - 180.0) / 20.0) * 20.0, 0.0)
                                        # Pitch variation: inverse of monotone score
                                        monotone = float(m.get('pitch', {}).get('monotone_score', 1.0))
                                        pitch = min(max((1.0 - monotone) * 100.0, 0.0), 100.0)
                                        # Simple average for delivery contribution
                                        delivery = (clarity + pace + pitch) / 3.0
                                        delivery_by_sec[sec] = delivery
                                    except Exception:
                                        continue
                                
                                # Blend sentiment-based engagement with delivery where available
                                blended = []
                                for point in engagement_timeline:
                                    try:
                                        sec = int(point['time'])
                                        base = float(point['engagement'])
                                        # Use nearest delivery within ±10s window
                                        nearest = None
                                        best_dt = 999
                                        for dsec, dval in delivery_by_sec.items():
                                            dist = abs(dsec - sec)
                                            if dist < best_dt and dist <= 10:
                                                best_dt = dist
                                                nearest = dval
                                        if nearest is not None:
                                            val = 0.7 * base + 0.3 * nearest
                                        else:
                                            val = base
                                        blended.append({"time": point["time"], "engagement": round(val, 1)})
                                    except Exception:
                                        blended.append(point)
                                engagement_timeline = blended
                                
                                # Apply EMA smoothing to preserve trends but reduce jitter
                                if engagement_timeline:
                                    alpha = 0.3
                                    smoothed = []
                                    prev = engagement_timeline[0]['engagement']
                                    for p in engagement_timeline:
                                        val = alpha * p['engagement'] + (1 - alpha) * prev
                                        smoothed.append({"time": p["time"], "engagement": round(val, 1)})
                                        prev = val
                                    engagement_timeline = smoothed
                    except Exception as e:
                        print(f"⚠ Delivery blending error: {e}")
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
    
    # Calculate talk time ratio - use real data, only fallback to defaults if absolutely necessary
    professor_ratio = None
    student_ratio = None
    
    if duration_minutes > 0:
        total_seconds = duration_minutes * 60
        
        # Professor talk time = total audio time recorded (when professor was speaking)
        # Student talk time = question periods (when questions were active) + estimated question time from transcript
        # Note: Question periods overlap with professor talk time, but we count them as student interaction time
        
        if total_seconds > 0:
            # Calculate base ratios
            professor_base_ratio = min((professor_talk_time_seconds / total_seconds) * 100, 100)
            student_base_ratio = min((student_talk_time_seconds / total_seconds) * 100, 100)
            
            print(f"📊 Talk time calculation: prof_sec={professor_talk_time_seconds:.1f}, student_sec={student_talk_time_seconds:.1f}, total_sec={total_seconds}, prof_base={professor_base_ratio:.1f}%, student_base={student_base_ratio:.1f}%")
            
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
            
            print(f"✓ Final talk time ratio: Professor={professor_ratio:.1f}%, Students={student_ratio:.1f}%")
        else:
            print(f"⚠ total_seconds is 0, cannot calculate talk time ratio")
            # Only use fallback if we truly cannot calculate
            professor_ratio = 68
            student_ratio = 32
    else:
        print(f"⚠ duration_minutes is 0, cannot calculate talk time ratio (using fallback 68/32)")
        # Only use fallback if duration is truly unavailable
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

    # Snapshot (or update) a lecture report so it appears in the Reports list even if end_lecture missed it
    try:
        exists = supabase.table("lecture_reports").select("lecture_id").eq("lecture_id", lecture_id).execute()
        payload = {
            "lecture_id": lecture_id,
            "professor_id": class_data.get("professor_id"),
            "topic": topic,
            "date": start_time,
            "duration_minutes": duration_minutes,
            "headline_engagement": engagement_score,
            "talk_time_professor": int(round(professor_ratio, 0)),
            "talk_time_students": int(round(student_ratio, 0)),
            "participation_rate": float(round(participation_rate, 1)),
            "timeline": engagement_timeline,
            "summary": {
                "attendance_count": attendance_count,
                "total_students": total_students,
                "participation_count": participation_count,
                "total_questions": total_questions
            }
        }
        if exists.data:
            supabase.table("lecture_reports").update(payload).eq("lecture_id", lecture_id).execute()
        else:
            supabase.table("lecture_reports").insert(payload).execute()
    except Exception as e:
        print(f"⚠ Failed to upsert lecture report snapshot in analytics: {e}")
    
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


@router.get("/reports")
async def list_reports(professor_id: str = Query(...)):
    """List stored lecture analytics reports for a professor."""
    try:
        res = supabase.table("lecture_reports").select(
            "lecture_id, topic, date, duration_minutes, headline_engagement, participation_rate, talk_time_professor, talk_time_students"
        ).eq("professor_id", professor_id).order("date", desc=True).execute()
        return res.data if res.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list reports: {e}")


@router.get("/reports/{lecture_id}")
async def get_report(lecture_id: str, professor_id: str = Query(...)):
    """Fetch a stored lecture analytics report; fallback to on-demand analytics if missing."""
    try:
        res = supabase.table("lecture_reports").select("*").eq("lecture_id", lecture_id).execute()
        if res.data:
            report = res.data[0]
            # Normalize date to formatted string
            try:
                dt = _parse_dt_eastern(report.get("date"))
                report["date_formatted"] = dt.strftime("%B %d, %Y") if dt else "N/A"
            except:
                report["date_formatted"] = "N/A"
            return report
    except Exception as e:
        print(f"⚠ Failed to fetch stored report: {e}")
    # Fallback: compute on-demand and persist snapshot so it appears next time
    analytics = await get_lecture_analytics(lecture_id, professor_id)  # type: ignore
    try:
        # Find professor_id via class -> classes table
        lecture_row = supabase.table("lectures").select("class_id,start_time").eq("lecture_id", lecture_id).execute().data
        cls = None
        if lecture_row:
            class_id = lecture_row[0].get("class_id")
            if class_id:
                cls_res = supabase.table("classes").select("professor_id").eq("class_id", class_id).execute()
                if cls_res.data:
                    cls = cls_res.data[0]
        payload = {
            "lecture_id": lecture_id,
            "professor_id": (cls or {}).get("professor_id", professor_id),
            "topic": analytics.get("topic"),
            "date": lecture_row[0].get("start_time") if lecture_row else None,
            "duration_minutes": analytics.get("duration_minutes"),
            "headline_engagement": analytics.get("engagement_score"),
            "talk_time_professor": analytics.get("talk_time_ratio", {}).get("professor"),
            "talk_time_students": analytics.get("talk_time_ratio", {}).get("students"),
            "participation_rate": analytics.get("participation_rate"),
            "timeline": analytics.get("engagement_timeline", []),
            "summary": {
                "attendance_count": analytics.get("attendance_count"),
                "total_students": analytics.get("total_students"),
                "participation_count": analytics.get("participation_count"),
                "total_questions": analytics.get("total_questions")
            }
        }
        exists = supabase.table("lecture_reports").select("lecture_id").eq("lecture_id", lecture_id).execute()
        if exists.data:
            supabase.table("lecture_reports").update(payload).eq("lecture_id", lecture_id).execute()
        else:
            supabase.table("lecture_reports").insert(payload).execute()
        print(f"📝 Saved fallback lecture report snapshot for {lecture_id}")
    except Exception as e:
        print(f"⚠ Failed to persist fallback report snapshot: {e}")
    return analytics

