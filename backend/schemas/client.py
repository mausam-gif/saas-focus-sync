from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from db.models import ReferralSource

class ClientBase(BaseModel):
    business_name: str
    primary_contact_name: str
    primary_contact_role: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[EmailStr] = None
    location: Optional[str] = None
    
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    instagram_url: Optional[str] = None
    
    referral_source: Optional[ReferralSource] = ReferralSource.OTHER
    referral_source_other: Optional[str] = None
    birthday: Optional[datetime] = None
    anniversary: Optional[datetime] = None
    
    follow_up_date: Optional[datetime] = None
    upsell_potential: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    business_name: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_role: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[EmailStr] = None
    location: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    instagram_url: Optional[str] = None
    referral_source: Optional[ReferralSource] = None
    referral_source_other: Optional[str] = None
    birthday: Optional[datetime] = None
    anniversary: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    upsell_potential: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    created_by: int

    model_config = {"from_attributes": True}
