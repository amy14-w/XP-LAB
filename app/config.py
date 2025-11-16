from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load .env file from project root
# This ensures the .env file is found even when running from different directories
project_root = Path(__file__).parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    openai_api_key: str
    database_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()

# Debug: Check if OpenAI API key is loaded (only print first/last chars for security)
if settings.openai_api_key:
    key_preview = f"{settings.openai_api_key[:7]}...{settings.openai_api_key[-4:]}" if len(settings.openai_api_key) > 11 else "***"
    print(f"✓ OpenAI API key loaded from .env: {key_preview}")
else:
    print("⚠ WARNING: OpenAI API key not found in .env file")

