"""
Vercel Python Serverless Entry Point for FastAPI.

This file MUST have 'app' defined at module level (not just imported)
so that Vercel's Python runtime can detect it via static analysis.
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

# Mount all routes from our main app
from routes_conf import api_router
from core.config import settings
from db.session import engine
from db.models import Base

Base.metadata.create_all(bind=engine)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Vast Focus Sync API - ONLINE"}
