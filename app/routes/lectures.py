from fastapi import APIRouter, HTTPException, UploadFile, File
from app.database import supabase
from app.models.lecture import Lecture, LectureCreate, LectureStatus
from app.utils.lecture_code import generate_lecture_code
from app.config import settings
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional
import aiofiles
import os

router = APIRouter()


@router.post("", response_model=Lecture)
async def create_lecture(lecture_data: LectureCreate):
    """Create a new lecture."""
    lecture_id = str(uuid4())
    
    result = supabase.table("lectures").insert({
        "lecture_id": lecture_id,
        "class_id": lecture_data.class_id,
        "status": LectureStatus.SCHEDULED.value
    }).execute()
    
    if result.data:
        return Lecture(**result.data[0])
    raise HTTPException(status_code=400, detail="Failed to create lecture")


@router.post("/{lecture_id}/start")
async def start_lecture(lecture_id: str):
    """Start a lecture and generate a 4-digit code."""
    lecture_code = generate_lecture_code()
    start_time = datetime.utcnow()
    
    # Ensure code is unique
    while True:
        existing = supabase.table("lectures").select("lecture_id").eq("lecture_code", lecture_code).eq("status", LectureStatus.ACTIVE.value).execute()
        if not existing.data:
            break
        lecture_code = generate_lecture_code()
    
    result = supabase.table("lectures").update({
        "lecture_code": lecture_code,
        "start_time": start_time.isoformat(),
        "status": LectureStatus.ACTIVE.value
    }).eq("lecture_id", lecture_id).execute()
    
    if result.data:
        return {"lecture_code": lecture_code, "start_time": start_time.isoformat()}
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.post("/{lecture_id}/end")
async def end_lecture(lecture_id: str):
    """End a lecture and save transcript if available."""
    end_time = datetime.utcnow()
    
    # Try to get transcript from memory (if WebSocket is still active)
    transcript_to_save = None
    try:
        from app.websockets.audio_handler import lecture_transcripts
        if lecture_id in lecture_transcripts:
            transcript_to_save = lecture_transcripts[lecture_id]
            if transcript_to_save and len(transcript_to_save.strip()) > 0:
                print(f"💾 Saving transcript from memory for lecture {lecture_id} ({len(transcript_to_save)} chars)...")
    except Exception as e:
        print(f"⚠ Could not access transcript from memory: {e}")
    
    # Calculate duration BEFORE updating the lecture (we need start_time from current record)
    duration_minutes = 0
    try:
        # Get current lecture to access start_time
        current_lecture = supabase.table("lectures").select("start_time, end_time").eq("lecture_id", lecture_id).execute()
        if current_lecture.data:
            start_time_str = current_lecture.data[0].get("start_time")
            existing_end_time = current_lecture.data[0].get("end_time")
            
            print(f"🔍 Duration calculation debug: lecture_id={lecture_id}, start_time={start_time_str}, existing_end_time={existing_end_time}, new_end_time={end_time.isoformat()}")
            
            if start_time_str:
                # Helper function for robust datetime parsing
                def parse_dt(dt_str):
                    if not dt_str:
                        return None
                    if isinstance(dt_str, str):
                        raw = dt_str
                        if raw.endswith('Z'):
                            raw = raw.replace('Z', '+00:00')
                        try:
                            dt = datetime.fromisoformat(raw)
                        except ValueError:
                            # Try alternative format
                            try:
                                dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S%z")
                            except:
                                dt = datetime.fromisoformat(raw.replace('Z', ''))
                                if dt.tzinfo is None:
                                    dt = dt.replace(tzinfo=timezone.utc)
                                return dt
                    else:
                        dt = dt_str
                    if dt and dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                
                sdt = parse_dt(start_time_str)
                edt = parse_dt(end_time.isoformat())
                
                print(f"🔍 Parsed datetimes: sdt={sdt}, edt={edt}")
                
                if sdt and edt:
                    duration_seconds = (edt - sdt).total_seconds()
                    duration_minutes = max(0, int(duration_seconds / 60))
                    print(f"✓ Calculated duration: {duration_minutes} minutes ({duration_seconds:.1f} seconds) from {sdt} to {edt}")
                else:
                    print(f"⚠ Could not parse start_time={start_time_str} (parsed={sdt}) or end_time={end_time.isoformat()} (parsed={edt})")
                    duration_minutes = 0
            else:
                print(f"⚠ Missing start_time in lecture record for {lecture_id}")
                duration_minutes = 0
        else:
            print(f"⚠ Could not find lecture {lecture_id} to calculate duration")
            duration_minutes = 0
    except Exception as e:
        print(f"⚠ Error calculating duration: {e}")
        import traceback
        traceback.print_exc()
        duration_minutes = 0
    
    print(f"🔍 Final duration_minutes before save: {duration_minutes}")
    
    # Update lecture with end time, status, transcript, AND duration_minutes
    update_data = {
        "end_time": end_time.isoformat(),
        "status": LectureStatus.ENDED.value,
        "duration_minutes": duration_minutes  # Save duration directly to lectures table
    }
    
    if transcript_to_save:
        update_data["transcript"] = transcript_to_save
    
    print(f"🔍 Updating lecture {lecture_id} with: {update_data}")
    
    # Force-return updated row so result.data is populated (and proceed with snapshot regardless)
    result = supabase.table("lectures").update(update_data).eq("lecture_id", lecture_id).select("*").execute()
    
    if result.data:
        # Verify duration was saved correctly
        saved_duration = result.data[0].get("duration_minutes")
        print(f"🔍 Duration saved to database: {saved_duration} (expected: {duration_minutes})")
        if saved_duration is None or saved_duration != duration_minutes:
            print(f"⚠ WARNING: Duration mismatch! Saved={saved_duration}, Expected={duration_minutes}")
        
        # Attempt to snapshot a lecture report for later access
        try:
            # Use the updated lecture row from the update result (already has end_time and duration_minutes)
            lecture_row = result.data[0]
            class_id = lecture_row.get("class_id")
            start_time = lecture_row.get("start_time")
            end_time_str = lecture_row.get("end_time")
            # Use duration_minutes from the database (should match what we saved)
            duration_minutes = lecture_row.get("duration_minutes", duration_minutes)
            print(f"🔍 Using duration_minutes from database row: {duration_minutes}")
            class_row = supabase.table("classes").select("*").eq("class_id", class_id).execute().data[0] if class_id else None
            topic = class_row.get("name") if class_row else "Lecture"
            professor_id = class_row.get("professor_id") if class_row else None

            # Build engagement score and timeline from in-memory pipeline if available
            engagement_score = 75
            engagement_timeline = []
            try:
                from app.websockets.audio_handler import voice_pipelines
                if lecture_id in voice_pipelines and start_time:
                    pipeline = voice_pipelines[lecture_id]
                    sent_hist = getattr(pipeline, "sentiment_history", [])
                    if sent_hist:
                        # Calculate headline score using corrected mapping and confidence gating (>=0.5)
                        mapped = [
                            max(min(((s.get("sentiment_score", 0.0) + 1.0) / 2.0) * 100.0, 100.0), 0.0)
                            for s in sent_hist if s.get("confidence", 1.0) >= 0.5 and s.get("sentiment_score") is not None
                        ]
                        if mapped:
                            mapped.sort()
                            n = len(mapped)
                            engagement_score = int(round(mapped[n // 2] if n % 2 == 1 else (mapped[n // 2 - 1] + mapped[n // 2]) / 2.0))
                        # Timeline (seconds since start)
                        sdt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if isinstance(start_time, str) else start_time
                        for s in sent_hist:
                            try:
                                ts = s.get("timestamp")
                                if not ts or s.get("confidence", 1.0) < 0.5:
                                    continue
                                tdt = datetime.fromisoformat(ts.replace('Z', '+00:00')) if isinstance(ts, str) else ts
                                sec = int((tdt - sdt).total_seconds())
                                val = max(min(((s.get("sentiment_score", 0.0) + 1.0) / 2.0) * 100.0, 100.0), 0.0)
                                engagement_timeline.append({"time": str(sec), "engagement": round(val, 1)})
                            except:
                                continue
            except Exception as e:
                print(f"⚠ Could not build engagement for report: {e}")

            # Talk time ratios - calculate properly using question periods
            professor_ratio = None
            student_ratio = None
            try:
                from app.websockets.audio_handler import lecture_talk_time
                # Total seconds for ratio
                total_seconds = duration_minutes * 60 if duration_minutes and duration_minutes > 0 else 0
                prof_seconds = lecture_talk_time.get(lecture_id, 0.0) if total_seconds else 0.0
                
                # Get student talk time from question periods (same logic as analytics.py)
                student_talk_time_seconds = 0.0
                questions_from_db = 0
                try:
                    questions_result = supabase.table("questions").select("triggered_at, revealed_at").eq("lecture_id", lecture_id).eq("status", "revealed").execute()
                    if questions_result.data:
                        for question in questions_result.data:
                            triggered_at = question.get("triggered_at")
                            revealed_at = question.get("revealed_at")
                            if triggered_at and revealed_at:
                                try:
                                    # Helper to parse datetime
                                    def parse_dt_simple(dt_str):
                                        if not dt_str:
                                            return None
                                        if isinstance(dt_str, str):
                                            raw = dt_str
                                            if raw.endswith('Z'):
                                                raw = raw.replace('Z', '+00:00')
                                            dt = datetime.fromisoformat(raw)
                                        else:
                                            dt = dt_str
                                        if dt and dt.tzinfo is None:
                                            dt = dt.replace(tzinfo=timezone.utc)
                                        return dt
                                    trigger_dt = parse_dt_simple(triggered_at)
                                    reveal_dt = parse_dt_simple(revealed_at)
                                    if trigger_dt and reveal_dt:
                                        question_duration = (reveal_dt - trigger_dt).total_seconds()
                                        student_talk_time_seconds += max(0, question_duration)
                                        questions_from_db += 1
                                except Exception as e:
                                    print(f"⚠ Error calculating question duration: {e}")
                                    pass
                    
                    # Also estimate from transcript question marks
                    if transcript_to_save:
                        total_question_marks = transcript_to_save.count("?")
                        untracked_questions = max(0, total_question_marks - questions_from_db)
                        estimated_question_time = untracked_questions * 5  # 5 seconds per untracked question
                        student_talk_time_seconds += estimated_question_time
                except Exception as e:
                    print(f"⚠ Error calculating student talk time: {e}")
                    pass
                
                if total_seconds > 0:
                    # Calculate ratios properly
                    professor_base_ratio = min((prof_seconds / total_seconds) * 100.0, 100.0)
                    student_base_ratio = min((student_talk_time_seconds / total_seconds) * 100.0, 100.0)
                    
                    # If student time exceeds professor time, adjust
                    if student_base_ratio > professor_base_ratio:
                        professor_ratio = max(0, 100 - student_base_ratio)
                        student_ratio = student_base_ratio
                    else:
                        professor_ratio = professor_base_ratio
                        student_ratio = student_base_ratio
                        # Remaining time (silence/other) goes to professor
                        remaining = 100 - (professor_ratio + student_ratio)
                        if remaining > 0:
                            professor_ratio += remaining
                    
                    # Normalize to ensure they add up to 100%
                    total_ratio = professor_ratio + student_ratio
                    if total_ratio > 0:
                        professor_ratio = (professor_ratio / total_ratio) * 100
                        student_ratio = (student_ratio / total_ratio) * 100
                    
                    print(f"✓ Talk time ratio calculated: Professor={professor_ratio:.1f}%, Students={student_ratio:.1f}% (prof_sec={prof_seconds:.1f}, student_sec={student_talk_time_seconds:.1f}, total_sec={total_seconds})")
                else:
                    print(f"⚠ Cannot calculate talk time ratio: total_seconds={total_seconds}")
            except Exception as e:
                print(f"⚠ Error calculating talk time ratios: {e}")
                import traceback
                traceback.print_exc()
                pass

            # Participation rate snapshot
            participation_rate = 0.0
            try:
                attendance = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", lecture_id).execute()
                present = attendance.count if attendance and attendance.count else 0
                part = supabase.table("participation_logs").select("*").eq("lecture_id", lecture_id).execute()
                participation_count = len(part.data) if part and part.data else 0
                participation_rate = (participation_count / present * 100.0) if present > 0 else 0.0
            except Exception:
                pass

            # Upsert report (insert if absent, else update)
            try:
                exists = supabase.table("lecture_reports").select("lecture_id").eq("lecture_id", lecture_id).execute()
                payload = {
                    "lecture_id": lecture_id,
                    "professor_id": professor_id,
                    "topic": topic,
                    "date": start_time,
                    "duration_minutes": duration_minutes,
                    "headline_engagement": engagement_score,
                    "talk_time_professor": int(round(professor_ratio, 0)) if professor_ratio is not None else None,
                    "talk_time_students": int(round(student_ratio, 0)) if student_ratio is not None else None,
                    "participation_rate": float(round(participation_rate, 1)),
                    "timeline": engagement_timeline,
                    "summary": {
                        "transcript_chars": len(transcript_to_save) if transcript_to_save else 0
                    }
                }
                if exists.data:
                    supabase.table("lecture_reports").update(payload).eq("lecture_id", lecture_id).execute()
                else:
                    supabase.table("lecture_reports").insert(payload).execute()
                print(f"📝 Saved lecture report snapshot for {lecture_id}")
            except Exception as e:
                print(f"⚠ Failed saving lecture report snapshot: {e}")
        except Exception as e:
            print(f"⚠ Report snapshot flow failed: {e}")

        # Mark lecture ended in the audio websocket handler to stop further processing
        try:
            from app.websockets.audio_handler import mark_lecture_ended
            mark_lecture_ended(lecture_id)
        except Exception as e:
            # Non-fatal if websocket handler isn't loaded; just log
            print(f"ℹ Could not mark lecture {lecture_id} as ended in audio handler: {e}")

        message = {"message": "Lecture ended", "end_time": end_time.isoformat()}
        if transcript_to_save:
            message["transcript_saved"] = True
            message["transcript_length"] = len(transcript_to_save)
        return message
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.get("/{lecture_id}")
async def get_lecture(lecture_id: str):
    """Get lecture details."""
    result = supabase.table("lectures").select("*").eq("lecture_id", lecture_id).execute()
    
    if result.data:
        return Lecture(**result.data[0])
    raise HTTPException(status_code=404, detail="Lecture not found")


@router.get("/{lecture_id}/attendance")
async def get_lecture_attendance(lecture_id: str):
    """Get attendance data for a live lecture."""
    # Get all students who checked in
    attendance_result = supabase.table("attendance_logs").select(
        "student_id, checked_in_at"
    ).eq("lecture_id", lecture_id).execute()
    
    # Get student details
    student_ids = [a["student_id"] for a in attendance_result.data] if attendance_result.data else []
    students_result = supabase.table("users").select("user_id, email").in_("user_id", student_ids).execute() if student_ids else type("obj", (), {"data": []})()
    
    # Get participation counts for each student
    students_with_data = []
    for attendance in attendance_result.data or []:
        student_id = attendance["student_id"]
        student_info = next((s for s in students_result.data if s["user_id"] == student_id), None)
        
        if student_info:
            # Count participation (questions answered)
            participation_count = supabase.table("question_responses").select(
                "response_id", count="exact"
            ).eq("student_id", student_id).eq("lecture_id", lecture_id).execute()
            
            participation = participation_count.count if participation_count.count else 0
            
            # Calculate last active (most recent response or check-in)
            last_response = supabase.table("question_responses").select(
                "answered_at"
            ).eq("student_id", student_id).eq("lecture_id", lecture_id).order(
                "answered_at", desc=True
            ).limit(1).execute()
            
            if last_response.data:
                last_active = last_response.data[0]["answered_at"]
                # Calculate time ago
                from datetime import datetime, timezone
                checked_time = datetime.fromisoformat(last_active.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)
                diff = now - checked_time
                if diff.total_seconds() < 60:
                    last_active_str = "Just now"
                elif diff.total_seconds() < 3600:
                    minutes = int(diff.total_seconds() / 60)
                    last_active_str = f"{minutes} min ago"
                else:
                    hours = int(diff.total_seconds() / 3600)
                    last_active_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                last_active_str = "Never"
            
            students_with_data.append({
                "id": student_id,
                "name": student_info["email"].split("@")[0],
                "email": student_info["email"],
                "present": True,
                "participated": participation,
                "lastActive": last_active_str,
                "checked_in_at": attendance["checked_in_at"]
            })

    # Append demo dummy students so the professor sees participants during the demo
    try:
        from app.routes.students import _DUMMY_STUDENTS  # reuse demo list
        for d in _DUMMY_STUDENTS:
            students_with_data.append({
                "id": d["student_id"],
                "name": d["email"].split("@")[0],
                "email": d["email"],
                "present": True,
                "participated": 0,
                "lastActive": "Just now",
                "checked_in_at": datetime.utcnow().isoformat() + "Z"
            })
    except Exception:
        pass
    
    return {
        "students": students_with_data,
        "total_present": len(students_with_data)
    }


@router.post("/{lecture_id}/upload-presentation")
async def upload_presentation(lecture_id: str, file: UploadFile = File(...)):
    """Upload presentation file to Supabase Storage."""
    # Read file content
    content = await file.read()
    
    # Upload to Supabase Storage
    file_path = f"presentations/{lecture_id}/{file.filename}"
    
    try:
        # Supabase storage upload
        storage_response = supabase.storage.from_("presentations").upload(
            file_path,
            content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        url_response = supabase.storage.from_("presentations").get_public_url(file_path)
        
        # Update lecture with file URL
        supabase.table("lectures").update({
            "presentation_file_url": url_response
        }).eq("lecture_id", lecture_id).execute()
        
        return {"message": "File uploaded successfully", "url": url_response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

