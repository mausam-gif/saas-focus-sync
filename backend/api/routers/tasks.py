from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import Task, User, UserRole, Project
from schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter()


def enrich_task(task: Task, db: Session) -> dict:
    """Add human-readable names to a task."""
    user = db.query(User).filter(User.id == task.assigned_user).first()
    sender = db.query(User).filter(User.id == task.assigned_by).first() if task.assigned_by else None
    project = db.query(Project).filter(Project.id == task.project_id).first() if task.project_id else None
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "project_id": task.project_id,
        "assigned_user": task.assigned_user,
        "assigned_by": task.assigned_by,
        "due_date": task.due_date,
        "status": task.status,
        "progress": task.progress,
        "assigned_user_name": user.name if user else None,
        "assigned_by_name": sender.name if sender else None,
        "project_name": project.name if project else None,
    }


@router.post("/", response_model=TaskResponse)
def create_task(
    *,
    db: Session = Depends(deps.get_db),
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Create and assign a task. Admin can assign to anyone; Manager can assign to employees only."""
    # If manager, ensure they're only assigning to employees
    if current_user.role == UserRole.MANAGER:
        target = db.query(User).filter(User.id == task_in.assigned_user).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target user not found")
        if target.role not in [UserRole.EMPLOYEE]:
            raise HTTPException(status_code=403, detail="Managers can only assign tasks to employees")

    task = Task(
        title=task_in.title,
        description=task_in.description,
        project_id=task_in.project_id,
        assigned_user=task_in.assigned_user,
        assigned_by=current_user.id,
        due_date=task_in.due_date,
        status=task_in.status,
        progress=task_in.progress,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return enrich_task(task, db)


@router.get("/", response_model=List[TaskResponse])
def read_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve tasks. Admin sees all; Manager sees tasks they assigned or tasks of their employees; Employee sees only their own."""
    if current_user.role == UserRole.ADMIN:
        tasks = db.query(Task).offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        # Tasks assigned by this manager OR tasks assigned to employees managed by this manager
        # OR tasks assigned TO this manager (new)
        tasks = db.query(Task).filter(
            (Task.assigned_by == current_user.id) |
            (Task.assigned_user == current_user.id) |
            (Task.assigned_user.in_(
                db.query(User.id).filter(User.manager_id == current_user.id)
            ))
        ).offset(skip).limit(limit).all()
    else:
        # Employee: only their own tasks
        tasks = db.query(Task).filter(Task.assigned_user == current_user.id).offset(skip).limit(limit).all()

    return [enrich_task(t, db) for t in tasks]


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    *,
    db: Session = Depends(deps.get_db),
    task_id: int,
    task_in: TaskUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Employees can only update status/progress on their own tasks
    if current_user.role == UserRole.EMPLOYEE:
        if task.assigned_user != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot update another user's task")
        update_data = task_in.model_dump(exclude_unset=True, include={"status", "progress"})
    else:
        update_data = task_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)
    db.add(task)
    db.commit()
    db.refresh(task)
    return enrich_task(task, db)


@router.delete("/{task_id}")
def delete_task(
    *,
    db: Session = Depends(deps.get_db),
    task_id: int,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
