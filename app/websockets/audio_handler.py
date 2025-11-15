from fastapi import WebSocket, WebSocketDisconnect
from app.services.ai_service import transcribe_audio, analyze_lecture_engagement
from app.database import supabase
from uuid import uuid4
from datetime import datetime
from typing import Dict
import asyncio

# Store active lecture transcripts and AI suggestion timers
lecture_transcripts: Dict[str, str] = {}  # lecture_id -> accumulated transcript
ai_suggestion_timers: Dict[str, asyncio.Task] = {}  # lecture_id -> timer task
last_question_time: Dict[str, datetime] = {}  # lecture_id -> last question time
rejection_delays: Dict[str, float] = {}  # lecture_id -> additional delay in seconds


async def audio_websocket_handler(websocket: WebSocket, lecture_id: str, professor_id: str):
    """Handle WebSocket connection for audio streaming from professor."""
    await websocket.accept()
    
    # Initialize transcript for this lecture
    if lecture_id not in lecture_transcripts:
        lecture_transcripts[lecture_id] = ""
        last_question_time[lecture_id] = datetime.utcnow()
    
    # Start AI suggestion timer (15 minutes)
    if lecture_id not in ai_suggestion_timers:
        ai_suggestion_timers[lecture_id] = asyncio.create_task(
            ai_question_suggestion_timer(lecture_id, professor_id, websocket)
        )
    
    try:
        while True:
            # Receive audio chunk
            data = await websocket.receive_bytes()
            
            # Transcribe audio
            transcript = await transcribe_audio(data)
            
            # Accumulate transcript
            lecture_transcripts[lecture_id] += " " + transcript
            
            # Analyze engagement (every 30 seconds or so)
            # In production, you'd batch this better
            if len(lecture_transcripts[lecture_id]) > 500:  # Analyze when enough content
                analysis = await analyze_lecture_engagement(lecture_transcripts[lecture_id])
                
                # Store feedback
                feedback_id = str(uuid4())
                supabase.table("ai_feedback").insert({
                    "feedback_id": feedback_id,
                    "lecture_id": lecture_id,
                    "feedback_type": "engagement",
                    "message": str(analysis),
                    "timestamp": datetime.utcnow().isoformat()
                }).execute()
                
                # Send feedback to professor
                await websocket.send_json({
                    "type": "ai_feedback",
                    "feedback": analysis
                })
                
                # Reset transcript accumulation (keep last 1000 chars for context)
                lecture_transcripts[lecture_id] = lecture_transcripts[lecture_id][-1000:]
                
    except WebSocketDisconnect:
        # Cleanup
        if lecture_id in ai_suggestion_timers:
            ai_suggestion_timers[lecture_id].cancel()
            del ai_suggestion_timers[lecture_id]
        if lecture_id in lecture_transcripts:
            del lecture_transcripts[lecture_id]


async def ai_question_suggestion_timer(lecture_id: str, professor_id: str, websocket: WebSocket):
    """Timer that suggests questions every 15 minutes (or +7 if rejected)."""
    while True:
        # Calculate wait time (15 minutes + any rejection delays)
        base_wait = 15 * 60  # 15 minutes
        additional_delay = rejection_delays.get(lecture_id, 0)
        wait_time = base_wait + additional_delay
        
        # Reset rejection delay after using it
        if lecture_id in rejection_delays:
            del rejection_delays[lecture_id]
        
        await asyncio.sleep(wait_time)
        
        # Check if lecture is still active
        lecture_result = supabase.table("lectures").select("status").eq("lecture_id", lecture_id).execute()
        if not lecture_result.data or lecture_result.data[0]["status"] != "active":
            break
        
        # Get recent transcript
        recent_transcript = lecture_transcripts.get(lecture_id, "")
        if len(recent_transcript) < 100:
            continue  # Not enough content yet
        
        # Generate question suggestion
        from app.services.ai_service import generate_question_full
        question_data = await generate_question_full(recent_transcript[-2000:])  # Last 2000 chars
        
        # Create question in database (pending status)
        from uuid import uuid4
        question_id = str(uuid4())
        supabase.table("questions").insert({
            "question_id": question_id,
            "lecture_id": lecture_id,
            "question_text": question_data["question_text"],
            "option_a": question_data["option_a"],
            "option_b": question_data["option_b"],
            "option_c": question_data["option_c"],
            "option_d": question_data["option_d"],
            "correct_answer": question_data["correct_answer"],
            "ai_suggested": True,
            "created_by": "ai",
            "status": "pending"
        }).execute()
        
        # Send suggestion to professor
        try:
            await websocket.send_json({
                "type": "question_suggestion",
                "question_id": question_id,
                "question": question_data
            })
        except:
            break  # Connection closed


def reset_question_timer(lecture_id: str):
    """Reset the AI question timer (when professor triggers a question)."""
    if lecture_id in ai_suggestion_timers:
        ai_suggestion_timers[lecture_id].cancel()
        del ai_suggestion_timers[lecture_id]
    
    # Timer will be restarted when audio stream reconnects
    # In production, you'd need to pass websocket reference to restart


def add_rejection_delay(lecture_id: str):
    """Add 7 minutes to the timer when professor rejects a question."""
    if lecture_id not in rejection_delays:
        rejection_delays[lecture_id] = 0
    rejection_delays[lecture_id] += 7 * 60  # Add 7 minutes

