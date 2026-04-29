from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from routes_conf import deps
from db.models import KPIMetric, Task, User, TaskStatus, UserRole, Project
from pydantic import BaseModel

class KPIMetricResponse(BaseModel):
    employee_id: int
    employee_name: Optional[str] = None
    productivity_score: float
    task_completion_rate: float
    efficiency_score: float
    task_score: float = 0.0
    project_score: float = 0.0
    form_score: float = 0.0

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
    Retrieve KPI metrics with optimized joining.
    """
    query = db.query(KPIMetric).options(joinedload(KPIMetric.employee))
    
    if current_user.role == UserRole.ADMIN:
        metrics = query.offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        metrics = query.join(User, KPIMetric.employee_id == User.id).filter(User.manager_id == current_user.id).offset(skip).limit(limit).all()
    else:
        metrics = query.filter(KPIMetric.employee_id == current_user.id).offset(skip).limit(limit).all()
        
    result = []
    for m in metrics:
        result.append({
            "employee_id": m.employee_id,
            "employee_name": m.employee.name if m.employee else "Unknown",
            "productivity_score": m.productivity_score,
            "task_completion_rate": m.task_completion_rate,
            "efficiency_score": m.efficiency_score,
            "task_score": m.task_score,
            "project_score": m.project_score,
            "form_score": m.form_score
        })
    return result

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get quick summary stats for dashboard cards. Optimized for speed.
    """
    # Organization isolation
    org_id = current_user.organization_id
    
    # Counts
    user_query = db.query(User).filter(User.organization_id == org_id)
    employee_count = user_query.filter(User.role == UserRole.EMPLOYEE).count()
    
    project_query = db.query(Project).filter(Project.organization_id == org_id)
    project_count = project_query.count()
    active_project_count = project_query.filter(Project.status != "COMPLETED").count()
    
    task_query = db.query(Task).join(User, Task.assigned_user == User.id).filter(User.organization_id == org_id)
    pending_tasks = task_query.filter(Task.status != "DONE").count()
    
    # Avg Productivity (Optimized query)
    avg_metrics = db.query(
        func.avg(KPIMetric.productivity_score).label("productivity"),
        func.avg(KPIMetric.task_completion_rate).label("completion"),
        func.avg(KPIMetric.efficiency_score).label("efficiency")
    ).join(User, KPIMetric.employee_id == User.id).filter(User.organization_id == org_id).first()
    
    return {
        "employee_count": employee_count,
        "project_count": project_count,
        "active_project_count": active_project_count,
        "pending_tasks_count": pending_tasks,
        "avg_productivity": round(avg_metrics.productivity or 0, 1),
        "avg_completion": round(avg_metrics.completion or 0, 1),
        "avg_efficiency": round(avg_metrics.efficiency or 0, 1)
    }

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
    from routes_conf.routers.kpi_forms import sync_kpi_scores
    total_score = sync_kpi_scores(db, employee_id)
    
    metric = db.query(KPIMetric).filter(KPIMetric.employee_id == employee_id).first()
    return {"message": "Metrics calculated successfully", "data": metric}

@router.post("/calculate/all")
def calculate_all_kpis(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Recalculate KPIs for all employees. Admin only.
    """
    from routes_conf.routers.kpi_forms import sync_all_kpis
    sync_all_kpis(db)
    return {"message": "All metrics calculated successfully"}
