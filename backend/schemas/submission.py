from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WorkSubmissionBase(BaseModel):
    project_id: int
    file_url: str
    comment: Optional[str] = None

class WorkSubmissionCreate(WorkSubmissionBase):
    pass

class WorkSubmissionResponse(WorkSubmissionBase):
    id: int
    employee_id: int
    timestamp: datetime
    model_config = {"from_attributes": True}
