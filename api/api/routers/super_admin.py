from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import Organization, User, UserRole
from schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from core.security import get_password_hash

router = APIRouter()

@router.get("/organizations", response_model=List[OrganizationResponse])
def get_organizations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
) -> Any:
    """List all organizations (Super Admin only)."""
    return db.query(Organization).all()

@router.post("/organizations", response_model=OrganizationResponse)
def create_organization(
    *,
    db: Session = Depends(deps.get_db),
    org_in: OrganizationCreate,
    admin_email: str,
    admin_password: str,
    admin_name: str,
    current_user: User = Depends(deps.get_current_active_super_admin),
) -> Any:
    """Create a new organization and its initial Admin user."""
    # Check if slug exists
    if db.query(Organization).filter(Organization.slug == org_in.slug).first():
        raise HTTPException(status_code=400, detail="Organization slug already exists.")
    
    # Check if user email exists
    if db.query(User).filter(User.email == admin_email).first():
        raise HTTPException(status_code=400, detail="Admin email already exists.")

    # Create Organization
    db_org = Organization(**org_in.model_dump())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)

    # Create Initial Admin
    db_admin = User(
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        name=admin_name,
        role=UserRole.ADMIN,
        organization_id=db_org.id
    )
    db.add(db_admin)
    db.commit()

    return db_org

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    org_in: OrganizationUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
) -> Any:
    """Update organization status or subscription."""
    db_org = db.query(Organization).filter(Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    update_data = org_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_org, field, value)
    
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org
