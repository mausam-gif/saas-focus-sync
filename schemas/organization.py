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
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_expires_at: Optional[datetime] = None
    admin_email: Optional[EmailStr] = None
    admin_name: Optional[str] = None
    admin_password: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    admin_email: Optional[str] = None
    admin_name: Optional[str] = None

    class Config:
        from_attributes = True
