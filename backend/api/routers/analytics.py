from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from api import deps
from db.models import KPIMetric, Task, User, TaskStatus, UserRole
from pydantic import BaseModel

class KPIMetricResponse(BaseModel):
    employee_id: int
    productivity_score: float
    task_completion_rate: float
    efficiency_score: float

    model_config = {"from_attributes": True}


router = APIRouter()

@router.get("/", response_model=List[KPIMetricResponse])
def read_kpi_metrics(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve KPI metrics.
    """
    if current_user.role == UserRole.ADMIN:
        metrics = db.query(KPIMetric).offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        metrics = db.query(KPIMetric).join(User, KPIMetric.employee_id == User.id).filter(User.manager_id == current_user.id).offset(skip).limit(limit).all()
    else:
        metrics = db.query(KPIMetric).filter(KPIMetric.employee_id == current_user.id).offset(skip).limit(limit).all()
    return metrics

@router.get("/company-kpi")
def get_company_kpi(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Get aggregated company KPIs for the admin dashboard.
    """
    total_metrics = db.query(KPIMetric).all()
    if not total_metrics:
        return {"productivity": 0, "completion": 0, "efficiency": 0}
    
    avg_prod = sum(m.productivity_score for m in total_metrics) / len(total_metrics)
    avg_comp = sum(m.task_completion_rate for m in total_metrics) / len(total_metrics)
    avg_eff = sum(m.efficiency_score for m in total_metrics) / len(total_metrics)
    
    return {
        "productivity": round(avg_prod, 1),
        "completion": round(avg_comp, 1),
        "efficiency": round(avg_eff, 1)
    }

@router.post("/calculate/{employee_id}")
def calculate_kpi(
    employee_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Calculate KPIs for an employee based on tasks and questions.
    """
    # Simply count completed tasks / total tasks
    total_tasks = db.query(func.count(Task.id)).filter(Task.assigned_user == employee_id).scalar()
    completed_tasks = db.query(func.count(Task.id)).filter(Task.assigned_user == employee_id, Task.status == TaskStatus.DONE).scalar()
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    
    # Mocking productivity and efficiency based on completion rate
    productivity_score = completion_rate * 0.9 
    efficiency_score = completion_rate * 0.85

    metric = db.query(KPIMetric).filter(KPIMetric.employee_id == employee_id).first()
    if not metric:
        metric = KPIMetric(
            employee_id=employee_id,
            productivity_score=productivity_score,
            task_completion_rate=completion_rate,
            efficiency_score=efficiency_score
        )
        db.add(metric)
    else:
        metric.productivity_score = productivity_score
        metric.task_completion_rate = completion_rate
        metric.efficiency_score = efficiency_score
    
    db.commit()
    db.refresh(metric)
    return {"message": "Metrics calculated successfully", "data": metric}
