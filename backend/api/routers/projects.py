from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import Project, User, UserRole
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()

@router.post("/", response_model=ProjectResponse)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new project. Only Admin can create projects.
    """
    project = Project(**project_in.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/", response_model=List[ProjectResponse])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve projects. (In a real system we'd filter by accessible projects)
    """
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_in.model_dump(exclude_unset=True)
    
    # Restrict Managers to status and project metadata/specs
    if current_user.role == UserRole.MANAGER:
        allowed_keys = [
            "status", "shooting_date", "delivery_date", "service_category",
            "client_value_proposition", "total_budget", "current_spend", 
            "resource_allocation", "problem_solved", "shooting_fee", 
            "editing_fee", "the_hook"
        ]
        update_data = {k: v for k, v in update_data.items() if k in allowed_keys}
        if not update_data:
            raise HTTPException(status_code=400, detail="Managers can only update project metadata and status.")

    for field, value in update_data.items():
        setattr(project, field, value)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Delete a project. Admin only."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
