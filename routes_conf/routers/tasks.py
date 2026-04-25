from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routes_conf import deps
from db.models import Task, User, UserRole, Project, TaskStatus
from schemas.task import TaskCreate, TaskUpdate, TaskResponse
from routers.kpi_forms import sync_kpi_scores

router = APIRouter()


def enrich_task(task: Task, db: Session) -> dict:
    """Add human-readable names to a task."""
    user = db.query(User).filter(User.id == task.assigned_user).first()
    sender = db.query(User).filter(User.id == task.assigned_by).first() if task.assigned_by else None
    project = db.query(Project).filter(Project.id == task.project_id).first() if task.project_id else None
    client_name = None
    if project and project.client:
        client_name = project.client.business_name
        
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
        "completed_at": task.completed_at,
        "started_at": task.started_at,
        "completion_notes": task.completion_notes,
        "created_at": task.created_at,
        "assigned_user_name": user.name if user else None,
        "assigned_by_name": sender.name if sender else None,
        "project_name": project.name if project else None,
        "client_name": client_name,
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
        target_user = db.query(User).filter(User.id == task_in.assigned_user).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        if target_user.role not in [UserRole.EMPLOYEE]:
            raise HTTPException(status_code=403, detail="Managers can only assign tasks to employees")

    task = Task(
        title=task_in.title,
        description=task_in.description,
        assigned_user=task_in.assigned_user,
        assigned_by=current_user.id,
        project_id=task_in.project_id,
        due_date=task_in.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Sync KPI for the assigned user
    try:
        sync_kpi_scores(db, task.assigned_user)
    except Exception as e:
        print(f"Error syncing KPI: {e}")

    return enrich_task(task, db)


@router.get("/", response_model=List[TaskResponse])
def read_tasks(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve tasks. Admin sees all; Manager sees tasks they assigned or tasks of their employees; Employee sees only their own."""
    query = db.query(Task)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)

    if current_user.role == UserRole.ADMIN:
        tasks = query.offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        # Get ALL employee user IDs — managers oversee all employees regardless of manager_id link
        from sqlalchemy import select as sa_select
        employee_ids_q = sa_select(User.id).where(User.role == UserRole.EMPLOYEE)
        tasks = query.filter(
            (Task.assigned_by == current_user.id) |
            (Task.assigned_user == current_user.id) |
            (Task.assigned_user.in_(employee_ids_q))
        ).offset(skip).limit(limit).all()
    else:
        # Employee: only their own tasks
        tasks = query.filter(Task.assigned_user == current_user.id).offset(skip).limit(limit).all()

    return [enrich_task(t, db) for t in tasks]


# ── IMPORTANT: /export/excel MUST be defined BEFORE /{task_id} routes ──────────
@router.get("/export/excel")
def export_tasks_excel(
    db: Session = Depends(deps.get_db),
    project_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Export tasks to Excel for Admins and Managers."""
    import pandas as pd
    import io
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    query = db.query(Task)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    # Role-based filtering
    if current_user.role == UserRole.MANAGER:
        from sqlalchemy import select as sa_select
        employee_ids_q = sa_select(User.id).where(User.role == UserRole.EMPLOYEE)
        query = query.filter(
            (Task.assigned_by == current_user.id) |
            (Task.assigned_user == current_user.id) |
            (Task.assigned_user.in_(employee_ids_q))
        )
    
    tasks_list = query.all()
    data = []
    for t in tasks_list:
        enriched = enrich_task(t, db)
        
        # Calculate duration safely
        duration_str = "N/A"
        if t.completed_at:
            start_time = t.started_at or t.created_at or t.completed_at
            if start_time:
                try:
                    diff = t.completed_at - start_time
                    days = diff.days
                    hours, remainder = divmod(diff.seconds, 3600)
                    minutes, _ = divmod(remainder, 60)
                    duration_str = f"{days}d {hours}h {minutes}m"
                except Exception:
                    duration_str = "N/A"

        data.append({
            "Project": enriched["project_name"] or "General",
            "Task Title": t.title,
            "Description": t.description or "",
            "Assignee": enriched["assigned_user_name"] or f"ID: {t.assigned_user}",
            "Assigned By": enriched["assigned_by_name"] or "",
            "Status": t.status.value if hasattr(t.status, 'value') else str(t.status),
            "Due Date": t.due_date.strftime("%Y-%m-%d %H:%M") if t.due_date else "N/A",
            "Created At": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "N/A",
            "Started At": t.started_at.strftime("%Y-%m-%d %H:%M") if t.started_at else "N/A",
            "Completed At": t.completed_at.strftime("%Y-%m-%d %H:%M") if t.completed_at else "N/A",
            "Duration": duration_str,
            "Completion Notes": t.completion_notes or ""
        })

    df = pd.DataFrame(data)
    
    # Create Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Tasks Report')
    
    output.seek(0)
    
    filename = f"tasks_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
        update_data = task_in.model_dump(exclude_unset=True, include={"status", "progress", "completion_notes"})
    else:
        update_data = task_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "status":
            from datetime import datetime
            
            # Enforce strict progression for employees
            if current_user.role == UserRole.EMPLOYEE:
                status_order = {"TODO": 0, "IN_PROGRESS": 1, "DONE": 2}
                current_order = status_order.get(task.status.value if hasattr(task.status, 'value') else task.status, 0)
                new_order = status_order.get(value, 0)
                if new_order < current_order:
                    raise HTTPException(status_code=400, detail="Employees cannot revert a task to a previous state.")

            if value == "IN_PROGRESS" and (task.status.value if hasattr(task.status, 'value') else task.status) == "TODO":
                if not task.started_at:
                    task.started_at = datetime.now()
            elif value == "DONE" and (task.status.value if hasattr(task.status, 'value') else task.status) != "DONE":
                task.completed_at = datetime.now()
        setattr(task, field, value)
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Recalculate KPI for the assigned user
    try:
        sync_kpi_scores(db, task.assigned_user)
    except Exception as e:
        print(f"Error syncing KPI for user {task.assigned_user}: {e}")
    
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
    
    # Managers cannot delete tasks assigned BY an Admin
    if current_user.role == UserRole.MANAGER:
        assigner = db.query(User).filter(User.id == task.assigned_by).first()
        if assigner and assigner.role == UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Managers cannot delete tasks assigned by an Admin.")
        # Managers cannot delete tasks assigned TO themselves (their personal tasks)
        if task.assigned_user == current_user.id:
            raise HTTPException(status_code=403, detail="Managers cannot delete their own personal tasks from the oversight panel.")

    assigned_user_id = task.assigned_user
    # Capture whether task was completed BEFORE deletion
    was_done = (task.status == TaskStatus.DONE)
    
    db.delete(task)
    db.commit()
    
    # Only sync KPIs if the deleted task was NOT completed.
    # Deleting a DONE task is just cleanup and must NOT penalize the employee's KPI.
    if not was_done:
        try:
            sync_kpi_scores(db, assigned_user_id)
        except Exception as e:
            print(f"Error syncing KPI after delete: {e}")
    
    return {"ok": True}
