from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NoteBase(BaseModel):
    title: Optional[str] = None
    content: str
    is_reminder: bool = False
    reminder_date: Optional[datetime] = None
    project_id: Optional[int] = None

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_reminder: Optional[bool] = None
    reminder_date: Optional[datetime] = None
    project_id: Optional[int] = None

class NoteResponse(NoteBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
