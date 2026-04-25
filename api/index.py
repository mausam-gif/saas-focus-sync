"""
Vercel Python Serverless Entry Point for FastAPI.
"""
import sys
import os

# Add project root to sys.path BEFORE any imports
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the app object at MODULE LEVEL so Vercel detects it
app = FastAPI(
    title="Employee Monitoring & Project Management API",
    description="Backend API for Employee Monitoring SaaS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routes - NO database connection at startup (lazy connection)
from routes_conf import api_router
from core.config import settings

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Vast Focus Sync API - ONLINE", "status": "ok"}
