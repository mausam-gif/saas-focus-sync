from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ChatMessageCreate(BaseModel):
    message: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    recipient_id: Optional[int] = None # NULL for group chat

class ChatMessageUpdate(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_role: str
    recipient_id: Optional[int] = None
    recipient_name: Optional[str] = None
    message: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    is_read: bool = False
    timestamp: datetime

    model_config = {"from_attributes": True}
