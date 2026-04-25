import os
import uuid
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from .api import deps
from .db.models import User
from .core.config import settings
from supabase import create_client, Client

router = APIRouter()

# Initialize Supabase client
supabase: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

ALLOWED_TYPES = {
    # Images
    "image/jpeg", "image/png", "image/gif", "image/webp",
    # Audio
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
    "audio/mp4", "audio/x-m4a",
    # Documents
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    # Excel
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    # PowerPoint
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    # Video
    "video/mp4", "video/webm",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Upload a file to Supabase Storage."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed."
        )

    # Determine type category
    if file.content_type.startswith("audio/"):
        attachment_type = "audio"
    elif file.content_type.startswith("image/"):
        attachment_type = "image"
    elif file.content_type.startswith("video/"):
        attachment_type = "video"
    else:
        attachment_type = "file"

    # Generate unique filename
    ext = os.path.splitext(file.filename or "upload")[1] or ""
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    # Upload to Supabase
    if supabase:
        try:
            # Upload file
            res = supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                path=unique_name,
                file=content,
                file_options={"content-type": file.content_type}
            )
            
            # Get public URL
            file_url = supabase.storage.from_(settings.SUPABASE_BUCKET).get_public_url(unique_name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase upload failed: {str(e)}")
    else:
        # Fallback to local (not recommended for Vercel, but useful for local dev)
        UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        file_url = f"/uploads/{unique_name}"

    return {
        "url": file_url,
        "filename": file.filename,
        "type": attachment_type,
        "content_type": file.content_type,
        "size_bytes": len(content),
    }
