import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Employee Monitoring API"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE (Using SQLite for local development)
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./employee_monitoring.db"

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
