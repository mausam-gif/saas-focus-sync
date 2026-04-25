from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routes_conf import deps
from db.models import WorkSubmission, User, UserRole
from schemas.submission import WorkSubmissionCreate, WorkSubmissionResponse

router = APIRouter()

@router.post("/", response_model=WorkSubmissionResponse)
def create_submission(
    *,
    db: Session = Depends(deps.get_db),
    submission_in: WorkSubmissionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit work.
    """
    submission = WorkSubmission(
        employee_id=current_user.id,
        project_id=submission_in.project_id,
        file_url=submission_in.file_url,
        comment=submission_in.comment
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Recalculate KPI for the employee
    try:
        from routers.kpi_forms import sync_kpi_scores
        sync_kpi_scores(db, current_user.id)
    except Exception as e:
        print(f"Error syncing KPI for user {current_user.id}: {e}")
        
    return submission

@router.get("/", response_model=List[WorkSubmissionResponse])
def read_submissions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Read work submissions. Roles affect visibility.
    """
    if current_user.role == UserRole.ADMIN:
        submissions = db.query(WorkSubmission).offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        submissions = db.query(WorkSubmission).join(User, WorkSubmission.employee_id == User.id).filter(User.manager_id == current_user.id).offset(skip).limit(limit).all()
    else:
        submissions = db.query(WorkSubmission).filter(WorkSubmission.employee_id == current_user.id).offset(skip).limit(limit).all()
    return submissions
