from pydantic import BaseModel, EmailStr
from typing import Optional
from db.models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.EMPLOYEE
    manager_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    manager_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    manager_id: Optional[int] = None

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
