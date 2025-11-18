from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from app.database import supabase
from app.models.question import Question, QuestionCreate, QuestionResponse, QuestionResult, QuestionStatus, QuestionMode
from app.services.ai_service import generate_question_full, generate_answers_only
from app.services.gamification import increment_correct_answers
from uuid import uuid4
from datetime import datetime
from typing import Dict, Set
import asyncio
import json

router = APIRouter()

# Store active question timers and WebSocket connections
active_question_timers: Dict[str, asyncio.Task] = {}
question_websockets: Dict[str, Set[WebSocket]] = {}  # lecture_id -> set of websockets


@router.post("", response_model=Question)
async def create_question(question_data: QuestionCreate, professor_id: str):
    """Create a question (AI-generated, manual, or hybrid)."""
    question_id = str(uuid4())
    lecture_id = question_data.lecture_id
    
    # Get recent lecture transcript for context (fallback)
    from app.websockets.audio_handler import lecture_transcripts
    lecture_context = lecture_transcripts.get(lecture_id, "Recent lecture content...")
    if len(lecture_context) > 2000:
        lecture_context = lecture_context[-2000:]  # Last 2000 chars
    
    # Get slide content if provided (from frontend - PowerPoint material)
    slide_content = getattr(question_data, 'slide_content', None) or ""
    
    question_text = question_data.question_text
    option_a = question_data.option_a
    option_b = question_data.option_b
    option_c = question_data.option_c
    option_d = question_data.option_d
    correct_answer = question_data.correct_answer
    
    if question_data.mode == QuestionMode.AI_FULL:
        # AI generates everything - prioritize slide content over transcript
        ai_result = await generate_question_full(lecture_context, slide_content=slide_content)
        question_text = ai_result["question_text"]
        option_a = ai_result["option_a"]
        option_b = ai_result["option_b"]
        option_c = ai_result["option_c"]
        option_d = ai_result["option_d"]
        correct_answer = ai_result["correct_answer"]
        created_by = "ai"
        
    elif question_data.mode == QuestionMode.HYBRID:
        # Professor question, AI generates answers
        if not question_text:
            raise HTTPException(status_code=400, detail="Question text required for hybrid mode")
        
        ai_result = await generate_answers_only(question_text, lecture_context)
        option_a = ai_result["option_a"]
        option_b = ai_result["option_b"]
        option_c = ai_result["option_c"]
        option_d = ai_result["option_d"]
        correct_answer = ai_result["correct_answer"]
        created_by = professor_id
        
    else:  # MANUAL_FULL
        # Professor provides everything
        if not all([question_text, option_a, option_b, option_c, option_d, correct_answer]):
            raise HTTPException(status_code=400, detail="All fields required for manual mode")
        created_by = professor_id
    
    result = supabase.table("questions").insert({
        "question_id": question_id,
        "lecture_id": lecture_id,
        "question_text": question_text,
        "option_a": option_a,
        "option_b": option_b,
        "option_c": option_c,
        "option_d": option_d,
        "correct_answer": correct_answer,
        "ai_suggested": False,
        "created_by": created_by,
        "status": QuestionStatus.PENDING.value
    }).execute()
    
    if result.data:
        return Question(**result.data[0])
    raise HTTPException(status_code=400, detail="Failed to create question")


@router.post("/{question_id}/trigger")
async def trigger_question(question_id: str):
    """Trigger a question to all students (Kahoot-style 20-second timer)."""
    # Get question
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_result.data[0]
    lecture_id = question["lecture_id"]
    
    # Reset AI question timer (when professor manually triggers)
    from app.websockets.audio_handler import reset_question_timer
    reset_question_timer(lecture_id)
    
    # Update question status
    triggered_at = datetime.utcnow()
    supabase.table("questions").update({
        "status": QuestionStatus.TRIGGERED.value,
        "triggered_at": triggered_at.isoformat()
    }).eq("question_id", question_id).execute()
    
    # Broadcast to all connected students
    if lecture_id in question_websockets:
        question_data = {
            "type": "question_triggered",
            "question_id": question_id,
            "question_text": question["question_text"],
            "option_a": question["option_a"],
            "option_b": question["option_b"],
            "option_c": question["option_c"],
            "option_d": question["option_d"],
            "timer": 20
        }
        
        # Send to all connected students
        disconnected = set()
        for ws in question_websockets[lecture_id]:
            try:
                await ws.send_json(question_data)
            except:
                disconnected.add(ws)
        
        # Remove disconnected websockets
        question_websockets[lecture_id] -= disconnected
        
        # Start 20-second timer
        active_question_timers[question_id] = asyncio.create_task(
            question_timer(question_id, lecture_id, 20)
        )
    
    return {"message": "Question triggered", "question_id": question_id}


async def question_timer(question_id: str, lecture_id: str, duration: int):
    """Handle question timer countdown and auto-reveal."""
    # Send countdown updates every second
    for remaining in range(duration, 0, -1):
        await asyncio.sleep(1)
        
        # Broadcast countdown to students
        if lecture_id in question_websockets:
            countdown_data = {
                "type": "timer_update",
                "question_id": question_id,
                "time_remaining": remaining
            }
            
            disconnected = set()
            for ws in question_websockets[lecture_id]:
                try:
                    await ws.send_json(countdown_data)
                except:
                    disconnected.add(ws)
            
            question_websockets[lecture_id] -= disconnected
    
    # Reveal answer
    await reveal_question_answer(question_id, lecture_id)


async def reveal_question_answer(question_id: str, lecture_id: str):
    """Reveal the correct answer and send results."""
    # Get question
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    if not question_result.data:
        return
    
    question = question_result.data[0]
    correct_answer = question["correct_answer"]
    
    # Get all responses
    responses = supabase.table("question_responses").select("*").eq("question_id", question_id).execute()
    
    total_responses = len(responses.data) if responses.data else 0
    correct_count = sum(1 for r in responses.data if r["is_correct"]) if responses.data else 0
    
    # Calculate response rate (get total students in lecture)
    attendance_count = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", lecture_id).execute()
    total_students = attendance_count.count if attendance_count.count else 1
    response_rate = (total_responses / total_students) * 100 if total_students > 0 else 0
    
    # Update question status
    revealed_at = datetime.utcnow()
    supabase.table("questions").update({
        "status": QuestionStatus.REVEALED.value,
        "revealed_at": revealed_at.isoformat()
    }).eq("question_id", question_id).execute()
    
    # Broadcast results
    if lecture_id in question_websockets:
        result_data = {
            "type": "answer_revealed",
            "question_id": question_id,
            "correct_answer": correct_answer,
            "total_responses": total_responses,
            "correct_count": correct_count,
            "response_rate": round(response_rate, 2)
        }
        
        disconnected = set()
        for ws in question_websockets[lecture_id]:
            try:
                await ws.send_json(result_data)
            except:
                disconnected.add(ws)
        
        question_websockets[lecture_id] -= disconnected


@router.post("/{question_id}/respond")
async def submit_answer(question_id: str, response_data: QuestionResponse, student_id: str):
    """Student submits answer to a question."""
    # Get question
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_result.data[0]
    
    # Check if question is still active
    if question["status"] != QuestionStatus.TRIGGERED.value:
        raise HTTPException(status_code=400, detail="Question is no longer active")
    
    # Check if already answered
    existing = supabase.table("question_responses").select("*").eq("question_id", question_id).eq("student_id", student_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already answered")
    
    # Check correctness
    is_correct = response_data.selected_answer == question["correct_answer"]
    
    # Store response
    response_id = str(uuid4())
    supabase.table("question_responses").insert({
        "response_id": response_id,
        "question_id": question_id,
        "student_id": student_id,
        "selected_answer": response_data.selected_answer,
        "is_correct": is_correct,
        "submitted_at": datetime.utcnow().isoformat()
    }).execute()
    
    # Update correct answer count if correct
    if is_correct:
        await increment_correct_answers(student_id)
    
    # Store response time in quiz_sessions for badge tracking
    response_time_ms = response_data.response_time_ms
    if response_time_ms:
        # Update the quiz_sessions entry we just created
        quiz_sessions = supabase.table("quiz_sessions").select("*").eq("student_id", student_id).eq("question_id", question_id).order("answered_at", desc=True).limit(1).execute()
        if quiz_sessions.data:
            supabase.table("quiz_sessions").update({
                "response_time_ms": response_time_ms
            }).eq("quiz_session_id", quiz_sessions.data[0]["quiz_session_id"]).execute()
    
    # Check for quiz badges
    from app.services.badges import check_quiz_badges
    badges_awarded = await check_quiz_badges(student_id, question["lecture_id"], question_id, is_correct, response_time_ms)
    
    # Check if all students answered (trigger early reveal)
    attendance_count = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", question["lecture_id"]).execute()
    total_students = attendance_count.count if attendance_count.count else 0
    
    response_count = supabase.table("question_responses").select("response_id", count="exact").eq("question_id", question_id).execute()
    answered_count = response_count.count if response_count.count else 0
    
    if total_students > 0 and answered_count >= total_students:
        # All students answered, reveal early
        if question_id in active_question_timers:
            active_question_timers[question_id].cancel()
        await reveal_question_answer(question_id, question["lecture_id"])
    
    return {
        "message": "Answer submitted",
        "is_correct": is_correct,
        "badges_awarded": badges_awarded
    }


@router.get("/{question_id}/results")
async def get_question_results(question_id: str):
    """Get question results and analytics."""
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_result.data[0]
    
    # Get responses
    responses = supabase.table("question_responses").select("*").eq("question_id", question_id).execute()
    
    total_responses = len(responses.data) if responses.data else 0
    correct_count = sum(1 for r in responses.data if r["is_correct"]) if responses.data else 0
    
    # Get total students
    attendance_count = supabase.table("attendance_logs").select("student_id", count="exact").eq("lecture_id", question["lecture_id"]).execute()
    total_students = attendance_count.count if attendance_count.count else 1
    response_rate = (total_responses / total_students) * 100 if total_students > 0 else 0
    
    return QuestionResult(
        question_id=question_id,
        correct_answer=question["correct_answer"],
        total_responses=total_responses,
        correct_count=correct_count,
        response_rate=round(response_rate, 2)
    )


@router.post("/{question_id}/accept")
async def accept_ai_suggestion(question_id: str, professor_id: str):
    """Professor accepts an AI-suggested question and triggers it."""
    # Get question
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_result.data[0]
    
    if not question["ai_suggested"]:
        raise HTTPException(status_code=400, detail="Question is not an AI suggestion")
    
    # Trigger the question
    return await trigger_question(question_id)


@router.post("/{question_id}/reject")
async def reject_ai_suggestion(question_id: str, professor_id: str):
    """Professor rejects an AI-suggested question (+7 minutes to timer)."""
    # Get question and lecture
    question_result = supabase.table("questions").select("*").eq("question_id", question_id).execute()
    
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_result.data[0]
    lecture_id = question["lecture_id"]
    
    # Delete the rejected question
    supabase.table("questions").delete().eq("question_id", question_id).execute()
    
    # Add 7 minutes to timer (handled in audio_handler)
    from app.websockets.audio_handler import add_rejection_delay
    add_rejection_delay(lecture_id)
    
    return {"message": "Question rejected", "timer_delay": "+7 minutes"}


@router.websocket("/lectures/{lecture_id}/questions")
async def question_websocket_endpoint(websocket: WebSocket, lecture_id: str):
    """WebSocket endpoint for students to receive questions in real-time."""
    await websocket.accept()
    
    # Add to connections
    if lecture_id not in question_websockets:
        question_websockets[lecture_id] = set()
    question_websockets[lecture_id].add(websocket)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back or handle specific messages if needed
    except WebSocketDisconnect:
        question_websockets[lecture_id].discard(websocket)

