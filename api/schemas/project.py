from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .schemas.client import ClientResponse
from .schemas.submission import WorkSubmissionResponse

class ProjectDocumentBase(BaseModel):
    file_name: str
    file_url: str
    file_type: Optional[str] = None

class ProjectDocumentCreate(ProjectDocumentBase):
    pass

class ProjectDocumentResponse(ProjectDocumentBase):
    id: int
    project_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class ProjectBase(BaseModel):
    name: str
    client_id: Optional[int] = None
    start_date: datetime
    shooting_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    deadline: datetime
    status: Optional[str] = "ANALYSIS"
    service_category: Optional[str] = None
    
    # Metadata
    client_value_proposition: Optional[str] = None
    total_budget: Optional[float] = None
    current_spend: Optional[float] = None
    resource_allocation: Optional[str] = None
    problem_solved: Optional[str] = None
    shooting_fee: Optional[float] = None
    editing_fee: Optional[float] = None
    the_hook: Optional[str] = None
    logo_url: Optional[str] = None
    documents: List[ProjectDocumentCreate] = []

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[int] = None
    start_date: Optional[datetime] = None
    shooting_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    service_category: Optional[str] = None
    client_value_proposition: Optional[str] = None
    total_budget: Optional[float] = None
    current_spend: Optional[float] = None
    resource_allocation: Optional[str] = None
    problem_solved: Optional[str] = None
    shooting_fee: Optional[float] = None
    editing_fee: Optional[float] = None
    the_hook: Optional[str] = None
    logo_url: Optional[str] = None
    documents: Optional[List[ProjectDocumentCreate]] = None

class ProjectResponse(ProjectBase):
    id: int
    client: Optional[ClientResponse] = None
    work_submissions: List[WorkSubmissionResponse] = []
    documents: List[ProjectDocumentResponse] = []

    model_config = {"from_attributes": True}
