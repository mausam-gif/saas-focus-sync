from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from .db.models import ReferralSource

class ClientDocumentBase(BaseModel):
    file_name: str
    file_url: str
    file_type: Optional[str] = None

class ClientDocumentCreate(ClientDocumentBase):
    pass

class ClientDocumentResponse(ClientDocumentBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

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
    logo_url: Optional[str] = None
    birthday: Optional[datetime] = None
    anniversary: Optional[datetime] = None
    
    follow_up_date: Optional[datetime] = None
    upsell_potential: Optional[str] = None

class ClientCreate(ClientBase):
    documents: List[ClientDocumentCreate] = []

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
    logo_url: Optional[str] = None
    birthday: Optional[datetime] = None
    anniversary: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    upsell_potential: Optional[str] = None
    documents: Optional[List[ClientDocumentCreate]] = None

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    created_by: int
    documents: List[ClientDocumentResponse] = []

    model_config = {"from_attributes": True}
