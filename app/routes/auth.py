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
            "options": {
                "data": {
                    "role": user_data.role.value
                }
            }
        })
        
        if response.user:
            # Check if email confirmation is required
            if not response.session:
                # Email confirmation required - user created but not signed in
                # Store user role in a custom table
                supabase.table("users").insert({
                    "user_id": response.user.id,
                    "email": user_data.email,
                    "role": user_data.role.value
                }).execute()
                
                return {
                    "message": "User registered successfully. Please check your email to confirm your account.",
                    "user_id": response.user.id,
                    "email_confirmation_required": True
                }
            
            # Email confirmation not required - user is signed in
            # Store user role in a custom table
            supabase.table("users").insert({
                "user_id": response.user.id,
                "email": user_data.email,
                "role": user_data.role.value
            }).execute()
            
            # Get user role
            user_data_result = supabase.table("users").select("*").eq("user_id", response.user.id).execute()
            role = user_data_result.data[0]["role"] if user_data_result.data else user_data.role.value
            
            return {
                "message": "User registered successfully",
                "user_id": response.user.id,
                "access_token": response.session.access_token,
                "email": response.user.email,
                "role": role,
                "email_confirmation_required": False
            }
        else:
            raise HTTPException(status_code=400, detail="Registration failed")
    except Exception as e:
        # Extract more specific error message from Supabase
        error_message = str(e)
        if "already registered" in error_message.lower() or "already exists" in error_message.lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "email" in error_message.lower() and "confirm" in error_message.lower():
            raise HTTPException(status_code=400, detail="Email confirmation required. Please check your email.")
        else:
            raise HTTPException(status_code=400, detail=f"Registration failed: {error_message}")


@router.post("/login")
async def login(credentials: UserLogin):
    """Login user."""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if email confirmation is required (session is None if not confirmed)
        if not response.session:
            raise HTTPException(
                status_code=401, 
                detail="Email not confirmed. Please check your email to confirm your account before logging in."
            )
        
        # Get user role
        user_data = supabase.table("users").select("*").eq("user_id", response.user.id).execute()
        role = user_data.data[0]["role"] if user_data.data else "student"
        
        return {
            "access_token": response.session.access_token,
            "user_id": response.user.id,
            "email": response.user.email,
            "role": role
        }
    except HTTPException:
        # Re-raise HTTP exceptions (like the ones above)
        raise
    except Exception as e:
        # Handle other errors
        error_message = str(e)
        if "Invalid login credentials" in error_message or "invalid" in error_message.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        elif "email" in error_message.lower() and "confirm" in error_message.lower():
            raise HTTPException(
                status_code=401, 
                detail="Email not confirmed. Please check your email to confirm your account."
            )
        else:
            raise HTTPException(status_code=401, detail=f"Login failed: {error_message}")


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

