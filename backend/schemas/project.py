from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProjectBase(BaseModel):
    name: str
    client_id: Optional[int] = None
    start_date: datetime
    shooting_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    deadline: datetime
    status: Optional[str] = "ACTIVE"
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

class ProjectResponse(ProjectBase):
    id: int

    model_config = {"from_attributes": True}
