from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title="Employee Monitoring & Project Management API",
    description="Backend API for Employee Monitoring SaaS",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes_conf import api_router
from core.config import settings
from db.session import engine
from db.models import Base

Base.metadata.create_all(bind=engine)

# Serve uploaded files (attachments) as static files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {"message": "Welcome to the Employee Monitoring API - VERIFIED"}

app.include_router(api_router, prefix=settings.API_V1_STR)
