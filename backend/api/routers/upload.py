import os
import shutil
import uuid
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from api import deps
from db.models import User

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    # Video
    "video/mp4", "video/webm",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Upload a file or audio attachment for check-in messages."""
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

    # Generate unique filename preserving extension
    ext = os.path.splitext(file.filename or "upload")[1] or ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Stream to disk and check size
    total_size = 0
    with open(file_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 64)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                buffer.close()
                os.remove(file_path)
                raise HTTPException(status_code=413, detail="File too large (max 50 MB)")
            buffer.write(chunk)

    # Return public URL
    file_url = f"/uploads/{unique_name}"
    return {
        "url": file_url,
        "filename": file.filename,
        "type": attachment_type,
        "content_type": file.content_type,
        "size_bytes": total_size,
    }
