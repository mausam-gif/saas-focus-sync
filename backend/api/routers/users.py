from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import User, UserRole
from schemas.user import UserCreate, UserUpdate, UserResponse, PasswordChange
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
        
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name,
        role=user_in.role,
        unit=user_in.unit,
        phone=user_in.phone,
        location=user_in.location,
        manager_id=manager_id
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
    """Retrieve users."""
    if current_user.role == UserRole.ADMIN:
        users = db.query(User).offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        # Managers can see everyone (as previously requested for interconnected features)
        users = db.query(User).offset(skip).limit(limit).all()
        # deduplicate NOT needed for this query, but in case of manual list merging:
        seen_ids = set()
        unique_users = []
        for u in users:
            if u.id not in seen_ids:
                unique_users.append(u)
                seen_ids.add(u.id)
        users = unique_users
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
    return current_user

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
