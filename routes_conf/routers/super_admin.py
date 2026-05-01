from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routes_conf import deps
from db.models import Organization, User, UserRole, OrganizationUnit, ProjectStep, StepAutomation
from schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from core.security import get_password_hash

router = APIRouter()

@router.get("/organizations", response_model=List[OrganizationResponse])
def get_organizations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
) -> Any:
    """List all organizations with their initial admin details."""
    orgs = db.query(Organization).all()
    res = []
    for org in orgs:
        # Find the first admin (smallest ID)
        admin = db.query(User).filter(User.organization_id == org.id, User.role == UserRole.ADMIN).order_by(User.id).first()
        org_data = OrganizationResponse.model_validate(org)
        if admin:
            org_data.admin_email = admin.email
            org_data.admin_name = admin.name
        res.append(org_data)
    return res

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

    # Seed Defaults automatically
    seed_organization_defaults(db, db_org.id)

    return db_org

def seed_organization_defaults(db: Session, org_id: int):
    """Seed an organization with standard default units and project steps."""
    # 1. Default Units
    units = ["PRODUCTION", "CREATIVE_AND_STRATEGY", "GROWTH_AND_ENGAGEMENT", "TEAM_DEVELOPMENT"]
    for u_name in units:
        if not db.query(OrganizationUnit).filter_by(organization_id=org_id, name=u_name).first():
            db.add(OrganizationUnit(organization_id=org_id, name=u_name))
    
    # 2. Default Steps
    steps = [
        ("ANALYSIS", "#3B82F6", 1),
        ("STRATEGY", "#A855F7", 2),
        ("EXECUTION", "#F97316", 3),
        ("ITERATION", "#EAB308", 4),
        ("EVALUATION", "#22C55E", 5)
    ]
    for name, color, order in steps:
        if not db.query(ProjectStep).filter_by(organization_id=org_id, name=name).first():
            db.add(ProjectStep(organization_id=org_id, name=name, color=color, order=order))
    
    db.commit()

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
    
    # Handle Admin Updates
    admin_email = update_data.pop("admin_email", None)
    admin_name = update_data.pop("admin_name", None)
    admin_password = update_data.pop("admin_password", None)
    
    if admin_email or admin_name or admin_password:
        admin = db.query(User).filter(User.organization_id == org_id, User.role == UserRole.ADMIN).order_by(User.id).first()
        if admin:
            if admin_email: admin.email = admin_email
            if admin_name: admin.name = admin_name
            if admin_password: admin.hashed_password = get_password_hash(admin_password)
            db.add(admin)

    for field, value in update_data.items():
        setattr(db_org, field, value)
    
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    """Delete an organization and all its data (cascade)."""
    db_org = db.query(Organization).filter(Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    db.delete(db_org)
    db.commit()
    return {"status": "success", "message": "Organization deleted"}

# --- Dynamic Settings Endpoints ---

from fastapi.encoders import jsonable_encoder

@router.get("/organizations/{org_id}/settings")
def get_organization_settings(
    org_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all dynamic settings for an organization."""
    # Security: Only SuperAdmin OR members of that organization can see settings
    if current_user.role != UserRole.SUPER_ADMIN and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these settings")
    
    units = db.query(OrganizationUnit).filter(OrganizationUnit.organization_id == org_id).all()
    steps = db.query(ProjectStep).filter(ProjectStep.organization_id == org_id).order_by(ProjectStep.order).all()
    
    # Enrich steps with automations
    enriched_steps = []
    for step in steps:
        autos = db.query(StepAutomation).filter(StepAutomation.step_id == step.id).all()
        enriched_steps.append({
            "id": step.id,
            "name": step.name,
            "color": step.color,
            "order": step.order,
            "automations": jsonable_encoder(autos)
        })
        
    return jsonable_encoder({
        "units": units,
        "steps": enriched_steps
    })

@router.post("/organizations/{org_id}/units")
def add_organization_unit(
    org_id: int,
    name: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    unit = OrganizationUnit(organization_id=org_id, name=name)
    db.add(unit)
    db.commit()
    return unit

@router.delete("/units/{unit_id}")
def delete_organization_unit(
    unit_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    unit = db.query(OrganizationUnit).get(unit_id)
    if unit:
        db.delete(unit)
        db.commit()
    return {"message": "Deleted"}

@router.post("/organizations/{org_id}/steps")
def add_project_step(
    org_id: int,
    name: str,
    color: str = "#4F46E5",
    order: int = 0,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    step = ProjectStep(organization_id=org_id, name=name, color=color, order=order)
    db.add(step)
    db.commit()
    return step

@router.delete("/steps/{step_id}")
def delete_project_step(
    step_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    step = db.query(ProjectStep).get(step_id)
    if step:
        db.delete(step)
        db.commit()
    return {"message": "Deleted"}

@router.post("/steps/{step_id}/automations")
def add_step_automation(
    step_id: int,
    designation: str,
    task_title: str,
    task_description: str = None,
    priority: str = "MEDIUM",
    due_days_offset: int = 1,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    auto = StepAutomation(
        step_id=step_id, 
        designation=designation, 
        task_title=task_title, 
        task_description=task_description,
        priority=priority,
        due_days_offset=due_days_offset
    )
    db.add(auto)
    db.commit()
    return auto

@router.delete("/automations/{auto_id}")
def delete_step_automation(
    auto_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    auto = db.query(StepAutomation).get(auto_id)
    if auto:
        db.delete(auto)
        db.commit()
    return {"message": "Deleted"}

@router.put("/units/{unit_id}")
def update_unit(
    unit_id: int,
    name: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    unit = db.query(OrganizationUnit).get(unit_id)
    if not unit: raise HTTPException(404, "Not found")
    unit.name = name
    db.commit()
    return unit

@router.put("/steps/{step_id}")
def update_step(
    step_id: int,
    name: Optional[str] = None,
    color: Optional[str] = None,
    order: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    step = db.query(ProjectStep).get(step_id)
    if not step: raise HTTPException(404, "Not found")
    if name: step.name = name
    if color: step.color = color
    if order is not None: step.order = order
    db.commit()
    return step

@router.put("/automations/{auto_id}")
def update_automation(
    auto_id: int,
    designation: Optional[str] = None,
    task_title: Optional[str] = None,
    task_description: Optional[str] = None,
    priority: Optional[str] = None,
    due_days_offset: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    auto = db.query(StepAutomation).get(auto_id)
    if not auto: raise HTTPException(404, "Not found")
    if designation: auto.designation = designation
    if task_title: auto.task_title = task_title
    if task_description: auto.task_description = task_description
    if priority: auto.priority = priority
    if due_days_offset is not None: auto.due_days_offset = due_days_offset
    db.commit()
    return auto

@router.post("/organizations/{org_id}/seed-defaults")
def manual_seed_defaults(
    org_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    """Manually trigger seeding for an existing organization."""
    seed_organization_defaults(db, org_id)
    return {"status": "success", "message": "Defaults seeded."}

@router.get("/designations")
def get_all_designations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_super_admin),
):
    """Get all unique designations used in the system."""
    res = db.query(User.designation).filter(User.designation != None).distinct().all()
    return [r[0] for r in res]
@router.get("/repair-db-get")
def repair_db_get(db: Session = Depends(deps.get_db)):
    """GET version for easy browser access."""
    from sqlalchemy import text
    try:
        # Use existing 'db' session which we know works for regular queries
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INTEGER"))
        db.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_step_id INTEGER"))
        db.execute(text("ALTER TABLE step_automations ADD COLUMN IF NOT EXISTS priority VARCHAR"))
        db.execute(text("ALTER TABLE step_automations ADD COLUMN IF NOT EXISTS due_days_offset INTEGER DEFAULT 1"))
        db.commit()
        return {"status": "success", "message": "Database schema patched successfully."}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
