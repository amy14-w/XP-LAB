from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    auth, classes, lectures, questions, attendance, participation, 
    students, analytics, streaks, engagement, settings
)
from app.websockets.audio_handler import audio_websocket_handler

app = FastAPI(title="XP Lab API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(classes.router, prefix="/classes", tags=["Classes"])
app.include_router(lectures.router, prefix="/lectures", tags=["Lectures"])
app.include_router(questions.router, prefix="/questions", tags=["Questions"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(participation.router, prefix="/participation", tags=["Participation"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(streaks.router, prefix="/streaks", tags=["Streaks"])
app.include_router(engagement.router, prefix="/engagement", tags=["Engagement"])
app.include_router(settings.router, prefix="/settings", tags=["Teacher Settings"])


@app.get("/")
async def root():
    return {
        "message": "XP Lab API", 
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Advanced ranking system (6 tiers)",
            "Streak multipliers and savers",
            "Question badges system",
            "Course-specific streak badges",
            "Engagement analytics",
            "Teacher custom settings"
        ]
    }


@app.websocket("/audio/stream/{lecture_id}")
async def audio_stream_endpoint(websocket: WebSocket, lecture_id: str, professor_id: str = Query(...)):
    """WebSocket endpoint for professor to stream audio for AI analysis."""
    await audio_websocket_handler(websocket, lecture_id, professor_id)

