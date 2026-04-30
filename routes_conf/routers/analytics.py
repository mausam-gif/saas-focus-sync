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
    from sqlalchemy import select, literal_column
    
    # Combined query for all counts and averages in one go
    # This is much faster as it's a single database roundtrip
    summary = db.execute(select(
        func.count(User.id).filter(User.role == UserRole.EMPLOYEE).label("employee_count"),
        
        # Subquery for projects
        select(func.count(Project.id)).where(Project.organization_id == org_id).scalar_subquery().label("project_count"),
        select(func.count(Project.id)).where(Project.organization_id == org_id, Project.status != "COMPLETED").scalar_subquery().label("active_projects"),
        
        # Subquery for tasks
        select(func.count(Task.id)).join(User, Task.assigned_user == User.id).where(User.organization_id == org_id, Task.status != "DONE").scalar_subquery().label("pending_tasks"),
        
        # Metrics
        func.avg(KPIMetric.productivity_score).label("avg_prod"),
        func.avg(KPIMetric.task_completion_rate).label("avg_comp"),
        func.avg(KPIMetric.efficiency_score).label("avg_eff")
    ).select_from(User).outerjoin(KPIMetric, User.id == KPIMetric.employee_id).where(User.organization_id == org_id)).first()

    return {
        "employee_count": summary.employee_count or 0,
        "project_count": summary.project_count or 0,
        "active_project_count": summary.active_projects or 0,
        "pending_tasks_count": summary.pending_tasks or 0,
        "avg_productivity": round(summary.avg_prod or 0, 1),
        "avg_completion": round(summary.avg_comp or 0, 1),
        "avg_efficiency": round(summary.avg_eff or 0, 1)
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
@router.get("/dashboard-full")
@router.get("/dashboard-full")
def get_full_dashboard_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Hyper-optimized 'Single-Query' dashboard endpoint.
    Retrieves the entire organizational state in one database execution
    using PostgreSQL JSON aggregation for maximum speed.
    """
    from sqlalchemy import text
    import json
    
    org_id = current_user.organization_id
    
    # This single SQL query fetches EVERYTHING at once in a single database roundtrip.
    # It aggregates summary stats, projects, users, tasks, metrics, and clients into a JSON object.
    sql = text("""
        SELECT json_build_object(
            'summary', (
                SELECT json_build_object(
                    'employee_count', COUNT(u.id) FILTER (WHERE u.role = 'EMPLOYEE'),
                    'project_count', (SELECT COUNT(*) FROM projects WHERE organization_id = :org_id),
                    'active_project_count', (SELECT COUNT(*) FROM projects WHERE organization_id = :org_id AND status != 'COMPLETED'),
                    'pending_tasks_count', (SELECT COUNT(t.id) FROM tasks t JOIN users tu ON t.assigned_user = tu.id WHERE tu.organization_id = :org_id AND t.status != 'DONE'),
                    'avg_productivity', ROUND(COALESCE(AVG(m.productivity_score), 0)::numeric, 1),
                    'avg_completion', ROUND(COALESCE(AVG(m.task_completion_rate), 0)::numeric, 1),
                    'avg_efficiency', ROUND(COALESCE(AVG(m.efficiency_score), 0)::numeric, 1)
                )
                FROM users u
                LEFT JOIN kpi_metrics m ON u.id = m.employee_id
                WHERE u.organization_id = :org_id
            ),
            'projects', (
                SELECT COALESCE(json_agg(p), '[]'::json) FROM (
                    SELECT * FROM projects WHERE organization_id = :org_id ORDER BY created_at DESC
                ) p
            ),
            'users', (
                SELECT COALESCE(json_agg(u), '[]'::json) FROM (
                    SELECT id, name, email, role, unit, phone, location, designation, manager_id FROM users WHERE organization_id = :org_id
                ) u
            ),
            'tasks', (
                SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                    SELECT t.* FROM tasks t 
                    JOIN users u ON t.assigned_user = u.id 
                    WHERE u.organization_id = :org_id 
                    ORDER BY t.created_at DESC LIMIT 10
                ) t
            ),
            'metrics', (
                SELECT COALESCE(json_agg(m), '[]'::json) FROM (
                    SELECT m.* FROM kpi_metrics m
                    JOIN users u ON m.employee_id = u.id
                    WHERE u.organization_id = :org_id
                ) m
            ),
            'clients', (
                SELECT COALESCE(json_agg(c), '[]'::json) FROM (
                    SELECT * FROM clients WHERE organization_id = :org_id
                ) c
            ),
            'questions', (
                SELECT COALESCE(json_agg(q), '[]'::json) FROM (
                    SELECT q.* FROM questions q
                    JOIN users u ON q.target_employee = u.id
                    WHERE u.organization_id = :org_id
                ) q
            )
        )
    """)
    
    result = db.execute(sql, {"org_id": org_id}).scalar()
    return result
