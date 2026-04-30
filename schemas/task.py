from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from db.models import TaskStatus, TaskPriority

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    assigned_user: int
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    progress: int = 0

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    progress: Optional[int] = None
    assigned_user: Optional[int] = None
    completion_notes: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    assigned_user: int
    assigned_by: Optional[int] = None
    due_date: Optional[datetime] = None
    status: TaskStatus
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    progress: int
    completed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    # Enriched fields
    assigned_user_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}
