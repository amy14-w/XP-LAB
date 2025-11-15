from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models.user import User, UserCreate, UserLogin
from app.config import settings

router = APIRouter()


@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })
        
        if response.user:
            # Store user role in a custom table
            supabase.table("users").insert({
                "user_id": response.user.id,
                "email": user_data.email,
                "role": user_data.role.value
            }).execute()
            
            return {"message": "User registered successfully", "user_id": response.user.id}
        else:
            raise HTTPException(status_code=400, detail="Registration failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(credentials: UserLogin):
    """Login user."""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })
        
        if response.user:
            # Get user role
            user_data = supabase.table("users").select("*").eq("user_id", response.user.id).execute()
            role = user_data.data[0]["role"] if user_data.data else "student"
            
            return {
                "access_token": response.session.access_token,
                "user_id": response.user.id,
                "email": response.user.email,
                "role": role
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def get_current_user(token: str):
    """Get current user info."""
    try:
        # Verify token and get user
        user = supabase.auth.get_user(token)
        
        if user:
            user_data = supabase.table("users").select("*").eq("user_id", user.user.id).execute()
            if user_data.data:
                return {
                    "user_id": user.user.id,
                    "email": user.user.email,
                    "role": user_data.data[0]["role"]
                }
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

