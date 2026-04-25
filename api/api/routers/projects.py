from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from .api import deps
from .db.models import Project, User, UserRole, Client, ProjectDocument
from .schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from .api.utils.automation import trigger_project_automation

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
    project_data = project_in.model_dump(exclude={"documents"})
    documents_data = project_in.documents
    
    project = Project(**project_data)
    db.add(project)
    db.flush() # Get project id

    for doc_in in documents_data:
        db_doc = ProjectDocument(**doc_in.model_dump(), project_id=project.id)
        db.add(db_doc)

    db.commit()
    db.refresh(project)
    trigger_project_automation(db, project, is_new=True)
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
    projects = db.query(Project).options(
        joinedload(Project.client).joinedload(Client.documents),
        joinedload(Project.work_submissions),
        joinedload(Project.documents)
    ).offset(skip).limit(limit).all()
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
    
    update_data = project_in.model_dump(exclude_unset=True, exclude={"documents"})
    documents_data = project_in.documents
    
    # Restrict Managers to status and project metadata/specs
    if current_user.role == UserRole.MANAGER:
        allowed_keys = [
            "status", "shooting_date", "delivery_date", "service_category",
            "client_value_proposition", "total_budget", "current_spend", 
            "resource_allocation", "problem_solved", "shooting_fee", 
            "editing_fee", "the_hook", "logo_url"
        ]
        update_data = {k: v for k, v in update_data.items() if k in allowed_keys}
    
    for field, value in update_data.items():
        if field == "logo_url" and (value == "" or value is None):
            setattr(project, field, None)
        else:
            setattr(project, field, value)
    
    if documents_data is not None:
        # For simplicity, we'll append new documents. 
        # In a real app we might want to reconcile (delete old etc.)
        for doc_in in documents_data:
            db_doc = ProjectDocument(**doc_in.model_dump(), project_id=project.id)
            db.add(db_doc)

    db.add(project)
    db.commit()
    db.refresh(project)
    if "status" in update_data:
        trigger_project_automation(db, project)
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
