from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from routes_conf import deps
from db.models import User, UserRole, Task, Project, ChatMessage, KPIMetric, TaskStatus
from schemas.user import UserCreate, UserUpdate, UserResponse, PasswordChange, UserStatusResponse
from core.security import get_password_hash, verify_password

router = APIRouter()

@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Create new user. Admin can create any, Manager can only create Employees.
    """
    if current_user.role == UserRole.MANAGER and user_in.role != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Managers can only create Employee accounts.")
    
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Automatically set manager_id for managers creating employees
    manager_id = user_in.manager_id
    if current_user.role == UserRole.MANAGER:
        manager_id = current_user.id
    
    # Enforce organization isolation
    # Only Super Admin can specify organization_id; others default to their own
    org_id = current_user.organization_id
    if current_user.role == UserRole.SUPER_ADMIN and hasattr(user_in, 'organization_id'):
         org_id = getattr(user_in, 'organization_id', None)
        
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        role=user_in.role,
        unit=user_in.unit,
        phone=user_in.phone,
        location=user_in.location,
        designation=user_in.designation,
        manager_id=manager_id,
        organization_id=org_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve users with multi-tenant isolation."""
    query = db.query(User)
    
    # Enforce isolation
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(User.organization_id == current_user.organization_id)
        # Never show super admins to regular users
        query = query.filter(User.role != UserRole.SUPER_ADMIN)
        
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        users = query.offset(skip).limit(limit).all()
    else:
        users = [current_user]
        
    return users

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a user. Only admin can do this.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
    
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a user. Only admin can do this.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from db.models import Task, KPIMetric, WorkSubmission, Response, Question
    
    # Manually cascade delete to avoid SQLite IntegrityErrors
    db.query(Task).filter(Task.assigned_user == user_id).delete()
    db.query(KPIMetric).filter(KPIMetric.employee_id == user_id).delete()
    db.query(WorkSubmission).filter(WorkSubmission.employee_id == user_id).delete()
    db.query(Response).filter(Response.employee_id == user_id).delete()
    db.query(Question).filter((Question.created_by == user_id) | (Question.target_employee == user_id)).delete()
    
    # Nullify manager_id for managed users
    db.query(User).filter(User.manager_id == user_id).update({"manager_id": None})
    
    db.delete(user)
    db.commit()
    return user

@router.get("/me", response_model=UserResponse)
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    # Ensure organization is loaded for the response_model
    if current_user.organization_id:
        # This will trigger lazy loading if not already loaded, 
        # but since we use response_model it will be serialized.
        pass
    return current_user

@router.get("/me/status", response_model=UserStatusResponse)
def get_user_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Aggregate all unread, pending, and KPI status data for real-time notifications.
    """
    # 1. Chat Unread
    unread_chats = db.query(ChatMessage).filter(
        ChatMessage.recipient_id == current_user.id,
        ChatMessage.is_read == False,
        ChatMessage.is_deleted == False
    ).count()

    latest_group = db.query(ChatMessage).filter(ChatMessage.recipient_id == None).order_by(ChatMessage.timestamp.desc()).first()
    has_group_unread = False
    if latest_group and latest_group.user_id != current_user.id:
        last_read = current_user.last_group_read_at or datetime.min
        if latest_group.timestamp > last_read:
            has_group_unread = True

    # 2. Pending Tasks
    pending_tasks = db.query(Task).filter(
        Task.assigned_user == current_user.id,
        Task.status != "DONE"
    ).count()

    # 3. Active Projects (Isolated by Org)
    active_projects = db.query(Project).filter(
        Project.organization_id == current_user.organization_id,
        Project.status != "COMPLETED"
    ).count()

    # 4. KPI Score (Average of primary metrics) - Exclude Admin/Owner
    own_score = 100.0
    is_red = False
    if current_user.role != UserRole.ADMIN:
        kpi_metric = db.query(KPIMetric).filter(KPIMetric.employee_id == current_user.id).first()
        if kpi_metric:
            own_score = (kpi_metric.productivity_score + kpi_metric.task_completion_rate + kpi_metric.efficiency_score) / 3.0
            is_red = own_score < 50.0
        else:
            own_score = 0.0

    # 5. Company KPI (for privileged, Isolated by Org)
    company_avg = None
    is_company_red = False
    if current_user.role in [UserRole.ADMIN, UserRole.MANAGER]:
        metrics = db.query(KPIMetric).join(User, KPIMetric.employee_id == User.id).filter(
            User.organization_id == current_user.organization_id,
            User.role != UserRole.SUPER_ADMIN
        ).all()
        if metrics:
            avg_val = sum((m.productivity_score + m.task_completion_rate + m.efficiency_score) / 3.0 for m in metrics) / len(metrics)
            company_avg = float(avg_val)
            is_company_red = company_avg < 50.0
        else:
            company_avg = 100.0

    return {
        "unread_chat_count": unread_chats,
        "has_group_unread": has_group_unread,
        "pending_tasks_count": pending_tasks,
        "active_projects_count": active_projects,
        "own_kpi": own_score,
        "company_kpi_avg": company_avg,
        "is_kpi_red": is_red,
        "is_company_kpi_red": is_company_red
    }

@router.put("/me/password")
def change_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: PasswordChange,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Change own password.
    """
    if not verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = get_password_hash(password_in.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully"}

@router.put("/{user_id}/profile", response_model=UserResponse)
def update_user_profile(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own profile or employee profile if manager/admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission check: own profile OR (manager/admin and allowed to edit this user)
    if current_user.id != user_id:
        if current_user.role == UserRole.ADMIN:
            pass # Admin can edit anyone
        elif current_user.role == UserRole.MANAGER and user.role == UserRole.EMPLOYEE:
            pass # Manager can edit employees (though usually theirs, the system is quite open)
        else:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = user_in.model_dump(exclude_unset=True)
    # Don't allow password change here (use /me/password)
    # Don't allow role/manager_id change unless admin
    if current_user.role != UserRole.ADMIN:
        update_data.pop("role", None)
        update_data.pop("manager_id", None)
        update_data.pop("password", None)

    if "password" in update_data and current_user.role == UserRole.ADMIN:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
