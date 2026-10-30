from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., description="Supabase service role key (server-only)")
    
    # Nebius AI
    NEBIUS_API_KEY: Optional[str] = Field(default=None, description="Nebius API key")
    NEBIUS_BASE_URL: str = Field(default="https://api.studio.nebius.ai/v1", description="Nebius API base URL")
    NEBIUS_MODEL: str = Field(default="nvidia/Nemotron-3-Ultra-550b-a55b", description="Nebius model ID")
    
    # Frontend
    FRONTEND_ORIGIN: str = Field(default="http://localhost:5173", description="Frontend origin for CORS")
    
    # Database (optional, for direct connections)
    DATABASE_URL: Optional[str] = Field(default=None, description="Direct PostgreSQL connection string")
    
    # App
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    
    # Rate limiting
    AI_RATE_LIMIT_REQUESTS: int = Field(default=10, description="AI requests per minute per user")
    AI_RATE_LIMIT_WINDOW: int = Field(default=60, description="Rate limit window in seconds")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()