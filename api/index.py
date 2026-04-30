"""
Vercel Python Serverless Entry Point for FastAPI.
"""
import sys
import os
import traceback

# Add project root to sys.path BEFORE any imports
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from routes_conf import deps

# Create the app object at MODULE LEVEL so Vercel detects it
app = FastAPI(
    title="Employee Monitoring & Project Management API",
    description="Backend API for Employee Monitoring SaaS",
    version="1.0.0"
)

# --- Nuclear CORS Fix ---
@app.middleware("http")
async def add_cors_headers(request, call_next):
    origin = request.headers.get("Origin")
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        response = Response()
    else:
        response = await call_next(request)
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"ERROR: {request.method} {request.url.path} - {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

# Mount all routes
from routes_conf import api_router
from core.config import settings

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root(db: Session = Depends(deps.get_db)):
    try:
        from sqlalchemy import text
        # Emergency Migration for Task Priority
        db.execute(text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taskpriority') THEN CREATE TYPE taskpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); END IF; END $$;"))
        db.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority taskpriority DEFAULT 'MEDIUM' NOT NULL;"))
        db.execute(text("SELECT 1"))
        return {"message": "Vast Focus Sync API - MIGRATED", "database": "CONNECTED"}
    except Exception as e:
        return {"message": "Vast Focus Sync API - ONLINE", "database": "ERROR", "detail": str(e)}

