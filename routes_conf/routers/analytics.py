from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from routes_conf import deps
from db.models import KPIMetric, Task, User, TaskStatus, UserRole, Project
from db.session import engine
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
    Enterprise Health Index: Optimized for millisecond performance.
    """
    org_id = current_user.organization_id
    
    # 1. Fetch only necessary scores (Optimized)
    scores_data = db.query(KPIMetric.productivity_score).join(User, KPIMetric.employee_id == User.id).filter(
        User.organization_id == org_id,
        User.role != UserRole.SUPER_ADMIN
    ).all()
    
    scores = sorted([s[0] for s in scores_data])
    count = len(scores)
    
    # Calculate Median/Avg
    if count == 0:
        median_score = 0.0
        avg_score = 0.0
    else:
        avg_score = sum(scores) / count
        median_score = scores[count // 2] if count % 2 == 1 else (scores[count // 2 - 1] + scores[count // 2]) / 2.0

    # 2. Three-Tier Alert System
    health_status = "HEALTHY" if median_score > 75 else ("WARNING" if median_score >= 60 else "CRITICAL")
        
    # 3. Department (Unit) Aggregation
    dept_stats = db.query(
        User.unit,
        func.avg(KPIMetric.productivity_score).label("avg_score"),
        func.count(User.id).label("count")
    ).join(KPIMetric, User.id == KPIMetric.employee_id).filter(
        User.organization_id == org_id,
        User.role != UserRole.SUPER_ADMIN
    ).group_by(User.unit).all()
    
    departments = [
        {
            "name": d.unit.value if hasattr(d.unit, 'value') else str(d.unit),
            "score": round(d.avg_score or 0, 1),
            "employee_count": d.count,
            "status": "HEALTHY" if (d.avg_score or 0) > 75 else ("WARNING" if (d.avg_score or 0) >= 60 else "CRITICAL")
        } for d in dept_stats if d.unit
    ]

    # Optimized counts
    project_count = db.query(Project.id).filter(Project.organization_id == org_id).count()
    active_projects = db.query(Project.id).filter(Project.organization_id == org_id, Project.status != "COMPLETED").count()
    pending_tasks = db.query(Task.id).join(User, Task.assigned_user == User.id).filter(
        User.organization_id == org_id, 
        Task.status != "DONE"
    ).count()

    return {
        "employee_count": count,
        "project_count": project_count,
        "active_project_count": active_projects,
        "pending_tasks_count": pending_tasks,
        "avg_productivity": round(avg_score, 1),
        "median_productivity": round(median_score, 1),
        "health_status": health_status,
        "is_kpi_red": median_score < 60,
        "is_kpi_amber": 60 <= median_score <= 75,
        "departments": departments,
        "low_performer_count": len([s for s in scores if s < 60]),
        "at_risk_percentage": round((len([s for s in scores if s < 60]) / count * 100) if count > 0 else 0, 1)
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

# --- Full Dashboard Caching ---
_full_dashboard_cache = {}
_CACHE_TTL = 15 # Seconds

@router.get("/dashboard-full")
def get_full_dashboard_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Consolidated dashboard data with TTL Caching for extreme performance.
    """
    import time
    org_id = current_user.organization_id
    cache_key = f"dashboard_{org_id}_{current_user.role}"
    
    # Check Cache
    if cache_key in _full_dashboard_cache:
        data, ts = _full_dashboard_cache[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return data

    from sqlalchemy import text
    
    query = text("""
        SELECT json_build_object(
            'summary', (
                SELECT json_build_object(
                    'employee_count', COUNT(u.id) FILTER (WHERE u.role = 'EMPLOYEE'),
                    'project_count', (SELECT COUNT(*) FROM projects WHERE organization_id = :org_id),
                    'active_project_count', (SELECT COUNT(*) FROM projects WHERE organization_id = :org_id AND status != 'COMPLETED'),
                    'pending_tasks_count', (SELECT COUNT(t.id) FROM tasks t JOIN users tu ON t.assigned_user = tu.id WHERE tu.organization_id = :org_id AND t.status != 'DONE'),
                    'avg_productivity', COALESCE(ROUND(AVG(m.productivity_score)::numeric, 1), 0),
                    'avg_completion', COALESCE(ROUND(AVG(m.task_completion_rate)::numeric, 1), 0),
                    'avg_efficiency', COALESCE(ROUND(AVG(m.efficiency_score)::numeric, 1), 0)
                )
                FROM users u
                LEFT JOIN kpi_metrics m ON u.id = m.employee_id
                WHERE u.organization_id = :org_id AND u.role != 'SUPER_ADMIN'
            ),
            'projects', (
                SELECT COALESCE(json_agg(p), '[]'::json) FROM (
                    SELECT id, name, description, status, start_date, deadline, organization_id, client_id, manager_id, logo_url
                    FROM projects WHERE organization_id = :org_id
                    ORDER BY id DESC
                ) p
            ),
            'users', (
                SELECT COALESCE(json_agg(u), '[]'::json) FROM (
                    SELECT id, name, email, role, unit, phone, location, designation, manager_id FROM users 
                    WHERE organization_id = :org_id AND role != 'SUPER_ADMIN'
                    ORDER BY id DESC
                ) u
            ),
            'tasks', (
                SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                    SELECT t.id, t.title, t.description, t.status, t.due_date, t.assigned_user, t.project_id 
                    FROM tasks t 
                    JOIN users u ON t.assigned_user = u.id 
                    WHERE u.organization_id = :org_id AND u.role != 'SUPER_ADMIN'
                    ORDER BY t.id DESC LIMIT 10
                ) t
            ),
            'metrics', (
                SELECT COALESCE(json_agg(m), '[]'::json) FROM (
                    SELECT m.id, m.employee_id, m.productivity_score, m.task_completion_rate, m.efficiency_score, m.task_score, m.project_score, m.form_score 
                    FROM kpi_metrics m
                    JOIN users u ON m.employee_id = u.id
                    WHERE u.organization_id = :org_id AND u.role != 'SUPER_ADMIN'
                ) m
            ),
            'clients', (
                SELECT COALESCE(json_agg(c), '[]'::json) FROM (
                    SELECT id, business_name, contact_person, email, phone, status 
                    FROM clients WHERE organization_id = :org_id
                ) c
            ),
            'questions', (
                SELECT COALESCE(json_agg(q), '[]'::json) FROM (
                    SELECT q.id, q.question_text as text, q.target_employee, q.created_by as creator_id 
                    FROM questions q
                    JOIN users u ON q.target_employee = u.id
                    WHERE u.organization_id = :org_id
                ) q
            )
        )
    """)
    
    result = db.execute(sql, {"org_id": org_id}).scalar()
    # return direct JSONResponse to bypass any further Pydantic processing
    return JSONResponse(content=result)
