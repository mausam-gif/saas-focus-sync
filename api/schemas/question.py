from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ResponseBase(BaseModel):
    response_text: str
    question_id: int

class ResponseCreate(ResponseBase):
    pass

class ResponseResponse(ResponseBase):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    timestamp: datetime
    model_config = {"from_attributes": True}


class QuestionBase(BaseModel):
    target_employee: int
    question_text: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None  # 'file' | 'audio' | 'image' | 'video'

class QuestionCreate(QuestionBase):
    pass

class CreatorResponse(BaseModel):
    id: int
    name: str
    role: str
    model_config = {"from_attributes": True}

class QuestionResponse(QuestionBase):
    id: int
    created_by: int
    creator: CreatorResponse
    responses: List[ResponseResponse] = []
    model_config = {"from_attributes": True}

