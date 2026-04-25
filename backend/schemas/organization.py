from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class OrganizationBase(BaseModel):
    name: str
    slug: str
    is_active: bool = True
    subscription_expires_at: Optional[datetime] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_expires_at: Optional[datetime] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
