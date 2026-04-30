from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from db.models import UserRole
from schemas.organization import OrganizationResponse

class UserBase(BaseModel):
    email: EmailStr
    name: str
    unit: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    designation: Optional[str] = None

    @field_validator("unit", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.EMPLOYEE
    manager_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    unit: Optional[UserUnit] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    organization_id: Optional[int] = None
    organization: Optional[OrganizationResponse] = None
    manager_id: Optional[int] = None
    unit_id: Optional[int] = None

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserStatusResponse(BaseModel):
    unread_chat_count: int
    has_group_unread: bool
    pending_tasks_count: int
    active_projects_count: int
    own_kpi: float
    company_kpi_avg: Optional[float] = None
    is_kpi_red: bool
    is_company_kpi_red: bool
