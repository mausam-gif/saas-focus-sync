from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProjectBase(BaseModel):
    name: str
    start_date: datetime
    deadline: datetime
    status: Optional[str] = "ACTIVE"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int

    model_config = {"from_attributes": True}
