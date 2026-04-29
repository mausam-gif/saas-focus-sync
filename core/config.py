import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Employee Monitoring API"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Priority 1: DATABASE_URL from Vercel/Environment
        db_url = os.getenv("DATABASE_URL") or self.DATABASE_URL
        
        if db_url:
            print(f"DEBUG: Using DATABASE_URL (starts with {db_url[:15]}...)")
            # SQLAlchemy 1.4+ needs postgresql:// instead of postgres://
            if db_url.startswith("postgres://"):
                return db_url.replace("postgres://", "postgresql://", 1)
            return db_url
        
        # Priority 2: Fallback to local SQLite (only for local dev)
        print("DEBUG: DATABASE_URL not found, falling back to local SQLite")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, "employee_monitoring.db")
        return f"sqlite:///{db_path}"

    # Supabase Storage
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "uploads")

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
