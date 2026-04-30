from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from routes_conf import deps
from datetime import datetime, timezone, timedelta
from db.models import (
    KPIForm, KPIQuestion, KPIFormAssignment, KPIResponse, KPIScore,
    User, UserRole, Task, KPIMetric, Project, WorkSubmission, TaskStatus
)
from schemas.kpi_forms import (
    KPIFormCreate, KPIFormResponse, AssignFormRequest, KPIAssignmentResponse,
    KPIFormSubmitRequest, KPIScoreResponse, CompanyKPIAnalytics, EmployeeKPIAnalytics
)
import json
from datetime import datetime, timezone

router = APIRouter()


# ─── KPI Score Engine ─────────────────────────────────────────────────────────

def normalize_answer(question_type: str, numeric_value: Optional[float]) -> float:
    """Normalize any answer to a 0–100 scale."""
    if numeric_value is None:
        return None  # Changed from 50.0 to None to allow exclusion
    if question_type == "RATING":
        return (numeric_value / 10.0) * 100
    if question_type == "PERCENTAGE":
        return min(max(numeric_value, 0), 100)
    if question_type == "NUMERIC":
        return min(numeric_value, 100)
    if question_type == "MULTIPLE_CHOICE":
        return numeric_value
    return None

def calculate_kpi_score(responses: list, questions: list) -> Optional[float]:
    """Calculate weighted KPI score from 0–100. Returns None if no rated questions."""
    question_map = {q.id: q for q in questions}
    total_weight = 0.0
    weighted_sum = 0.0
    
    for response in responses:
        question = question_map.get(response.question_id)
        if question:
            normalized = normalize_answer(question.question_type.value, response.numeric_value)
            if normalized is not None:
                weighted_sum += normalized * question.weight
                total_weight += question.weight

    if total_weight == 0:
        return None
        
    return round(min(max(weighted_sum / total_weight, 0), 100), 2)

def get_lateness_penalty(due_date: datetime, completion_date: datetime) -> float:
    """Calculate severity-based lateness penalty."""
    if not due_date or not completion_date: return 0.0
    if completion_date <= due_date: return 0.0
    
    delay = completion_date - due_date
    if delay <= timedelta(hours=24): return 3.0
    if delay <= timedelta(days=7): return 6.0
    return 8.0

def get_decay_multiplier(event_date: datetime, now: datetime) -> float:
    """Linear decay function: penalty * (1 - days_elapsed / 30)."""
    if not event_date: return 0.0
    days_elapsed = (now - event_date).total_seconds() / (24 * 3600)
    if days_elapsed >= 30: return 0.0
    return 1.0 - (days_elapsed / 30.0)

def get_priority_multiplier(priority: str) -> float:
    """Priority-based penalty multipliers."""
    multipliers = {
        "LOW": 0.5,
        "MEDIUM": 1.0,
        "HIGH": 1.5,
        "CRITICAL": 2.0
    }
    return multipliers.get(priority.upper(), 1.0)

def sync_kpi_scores(db: Session, employee_id: int) -> float:
    """Enterprise KPI Sync: Proportional, Severity-aware, and Rewarding."""
    now = datetime.now()
    
    # 1. Fetch Workload
    tasks = db.query(Task).filter(Task.assigned_user == employee_id).all()
    project_ids = db.query(Task.project_id).filter(Task.assigned_user == employee_id, Task.project_id != None).distinct().all()
    project_ids = [p[0] for p in project_ids]
    
    # Zero-Workload Rule
    if not tasks and not project_ids:
        # Update metric to null/0 to indicate insufficient data
        metric = db.query(KPIMetric).filter(KPIMetric.employee_id == employee_id).first()
        if metric:
            metric.productivity_score = 0.0 # Will show as 0 in UI or handle as 'Insufficient Data'
            db.commit()
        return 0.0

    # 2. Task Score Calculation (Volume Normalized)
    task_points = 100.0
    total_deductions = 0.0
    total_bonuses = 0.0
    
    # Work volume for normalization
    work_volume = sum(get_priority_multiplier(t.priority.value if hasattr(t.priority, 'value') else t.priority) for t in tasks) if tasks else 1.0
    
    streak_days = 0
    has_failed_recently = False
    
    for t in tasks:
        p_mult = get_priority_multiplier(t.priority.value if hasattr(t.priority, 'value') else t.priority)
        
        # Penalties
        if t.status == TaskStatus.DONE:
            if t.completed_at and t.due_date and t.completed_at > t.due_date:
                base_penalty = get_lateness_penalty(t.due_date, t.completed_at)
                decay = get_decay_multiplier(t.completed_at, now)
                total_deductions += base_penalty * p_mult * decay
                if (now - t.completed_at).days < 30: has_failed_recently = True
            elif t.completed_at and t.due_date and t.completed_at < t.due_date - timedelta(hours=24):
                # Positive Reinforcement: Early delivery bonus
                total_bonuses += 2.0 * p_mult
        else:
            if t.due_date and t.due_date < now:
                # Overdue Pending: Fixed heavy penalty until resolved
                total_deductions += 10.0 * p_mult
                has_failed_recently = True

    # 3. Project Score Calculation
    project_points = 100.0
    project_deductions = 0.0
    
    for pid in project_ids:
        project = db.query(Project).filter(Project.id == pid).first()
        if not project: continue
        
        submission = db.query(WorkSubmission).filter(
            WorkSubmission.employee_id == employee_id,
            WorkSubmission.project_id == pid
        ).order_by(WorkSubmission.timestamp.desc()).first()
        
        if not submission:
            if project.deadline and project.deadline < now:
                project_deductions += 15.0
                has_failed_recently = True
        else:
            if submission.timestamp and project.deadline and submission.timestamp > project.deadline:
                base_penalty = 13.0
                decay = get_decay_multiplier(submission.timestamp, now)
                project_deductions += base_penalty * decay
                if (now - submission.timestamp).days < 30: has_failed_recently = True

    # Streak Bonus
    if not has_failed_recently:
        total_bonuses += 5.0

    # Normalization & Clamping
    # Normalize deductions by work volume to keep it fair
    normalized_task_deduction = (total_deductions / work_volume) * 10 
    task_score = max(0, min(100.0, 100.0 - normalized_task_deduction + total_bonuses))
    project_score = max(0, 100.0 - project_deductions)

    # 4. KPI Form Score (Exclude Unrated)
    form_scores = db.query(KPIScore).filter(KPIScore.employee_id == employee_id).all()
    rated_scores = [s.score for s in form_scores if s.score is not None]
    avg_form_score = sum(rated_scores) / len(rated_scores) if rated_scores else 100.0

    # 5. Final Weighted Total (60% Task, 20% Project, 20% Form)
    total_score = (task_score * 0.6) + (project_score * 0.2) + (avg_form_score * 0.2)
    total_score = round(max(0, min(100.0, total_score)), 1)
    
    # Update KPIMetric
    metric = db.query(KPIMetric).filter(KPIMetric.employee_id == employee_id).first()
    if not metric:
        metric = KPIMetric(employee_id=employee_id)
        db.add(metric)
    
    metric.productivity_score = total_score
    metric.task_completion_rate = round((len([t for t in tasks if t.status == TaskStatus.DONE]) / len(tasks) * 100) if tasks else 0, 1)
    metric.efficiency_score = round(task_score, 1)
    metric.task_score = round(task_score, 1)
    metric.project_score = round(project_score, 1)
    metric.form_score = round(avg_form_score, 1)
    
    db.commit()
    return total_score

def sync_all_kpis(db: Session):
    """Recalculate KPI for all employees in the company."""
    users = db.query(User).filter(User.role == UserRole.EMPLOYEE).all()
    for user in users:
        try:
            sync_kpi_scores(db, user.id)
        except Exception as e:
            print(f"Error syncing KPI for user {user.id}: {e}")
    db.commit()
    return True


# ─── Create Form ──────────────────────────────────────────────────────────────

@router.post("/", response_model=KPIFormResponse)
def create_kpi_form(
    *,
    db: Session = Depends(deps.get_db),
    form_in: KPIFormCreate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Create a KPI form template with questions."""
    # Validate total weight sums to 1.0
    total_weight = sum(q.weight for q in form_in.questions)
    if form_in.questions and abs(total_weight - 1.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Question weights must sum to 1.0. Current sum: {total_weight:.2f}"
        )

    form = KPIForm(
        title=form_in.title,
        description=form_in.description,
        frequency=form_in.frequency,
        created_by=current_user.id,
        is_active=True
    )
    db.add(form)
    db.flush()

    for i, q_data in enumerate(form_in.questions):
        question = KPIQuestion(
            form_id=form.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            weight=q_data.weight,
            options=q_data.options,
            order=i
        )
        db.add(question)

    db.commit()
    db.refresh(form)

    return {
        **{c.name: getattr(form, c.name) for c in form.__table__.columns},
        "questions": form.questions,
        "creator_name": current_user.name
    }


# ─── List Forms ───────────────────────────────────────────────────────────────

@router.get("/", response_model=List[KPIFormResponse])
def list_kpi_forms(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """List all KPI form templates."""
    forms = db.query(KPIForm).filter(KPIForm.is_active == True).all()
    result = []
    for form in forms:
        creator = db.query(User).filter(User.id == form.created_by).first()
        result.append({
            **{c.name: getattr(form, c.name) for c in form.__table__.columns},
            "questions": form.questions,
            "creator_name": creator.name if creator else "Unknown"
        })
    return result


# ─── Assign Form ──────────────────────────────────────────────────────────────

@router.post("/{form_id}/assign")
def assign_form(
    form_id: int,
    assign_data: AssignFormRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Assign a KPI form to one or more employees."""
    form = db.query(KPIForm).filter(KPIForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    created = []
    target_ids = list(assign_data.employee_ids)

    if assign_data.is_company_wide:
        # Get all active employees and managers
        users = db.query(User).filter(User.role.in_([UserRole.EMPLOYEE, UserRole.MANAGER])).all()
        target_ids = [u.id for u in users]

    for emp_id in target_ids:
        # Check if already assigned and not submitted
        existing = db.query(KPIFormAssignment).filter(
            KPIFormAssignment.form_id == form_id,
            KPIFormAssignment.employee_id == emp_id,
            KPIFormAssignment.is_submitted == False
        ).first()
        if existing:
            continue

        assignment = KPIFormAssignment(
            form_id=form_id,
            employee_id=emp_id,
            assigned_by=current_user.id,
            due_date=assign_data.due_date,
            is_company_wide=assign_data.is_company_wide,
            is_submitted=False
        )
        db.add(assignment)
        created.append(emp_id)

    db.commit()
    return {
        "message": f"Form assigned to {len(created)} employee(s)",
        "assigned_to": created,
        "is_company_wide": assign_data.is_company_wide
    }


# ─── Delete Form ──────────────────────────────────────────────────────────────

@router.delete("/{form_id}")
def delete_kpi_form(
    form_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Soft-delete a KPI form (marks inactive). Admin/Manager only."""
    form = db.query(KPIForm).filter(KPIForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    form.is_active = False
    db.commit()
    return {"message": "Form deleted"}


# ─── Revoke Assignment ────────────────────────────────────────────────────────

@router.delete("/assignments/{assignment_id}")
def revoke_assignment(
    assignment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Remove a form assignment from an employee."""
    assignment = db.query(KPIFormAssignment).filter(KPIFormAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment revoked"}


# ─── Employee: Get My Forms ───────────────────────────────────────────────────

@router.get("/my-forms", response_model=List[KPIAssignmentResponse])
def get_my_forms(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all forms assigned to the current user."""
    assignments = db.query(KPIFormAssignment).filter(
        KPIFormAssignment.employee_id == current_user.id
    ).all()

    result = []
    for a in assignments:
        kpi_score_obj = db.query(KPIScore).filter(KPIScore.assignment_id == a.id).first()
        result.append({
            **{c.name: getattr(a, c.name) for c in a.__table__.columns},
            "form_title": a.form.title if a.form else None,
            "employee_name": current_user.name,
            "score": kpi_score_obj.score if kpi_score_obj else None
        })
    return result


# ─── Employee: Get Form Details for an Assignment ────────────────────────────

@router.get("/assignment/{assignment_id}/form")
def get_assignment_form(
    assignment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get form details (title, description, questions) for a specific assignment.
    The employee can only access forms assigned to them."""
    assignment = db.query(KPIFormAssignment).filter(
        KPIFormAssignment.id == assignment_id,
        KPIFormAssignment.employee_id == current_user.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or not assigned to you")

    form = assignment.form
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "frequency": form.frequency.value if hasattr(form.frequency, 'value') else form.frequency,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type.value if hasattr(q.question_type, 'value') else q.question_type,
                "weight": q.weight,
                "options": q.options,
                "order": q.order,
            }
            for q in sorted(form.questions, key=lambda x: x.order)
        ]
    }


# ─── Employee: Submit Form ────────────────────────────────────────────────────

@router.post("/submit/{assignment_id}")
def submit_form(
    assignment_id: int,
    submission: KPIFormSubmitRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Submit answers for an assigned form. Triggers KPI score calculation."""
    assignment = db.query(KPIFormAssignment).filter(
        KPIFormAssignment.id == assignment_id,
        KPIFormAssignment.employee_id == current_user.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.is_submitted:
        raise HTTPException(status_code=400, detail="Form already submitted")

    # Save responses
    for answer in submission.answers:
        response = KPIResponse(
            assignment_id=assignment_id,
            question_id=answer.question_id,
            employee_id=current_user.id,
            answer_text=answer.answer_text,
            numeric_value=answer.numeric_value
        )
        db.add(response)

    db.flush()

    # Calculate KPI score
    all_responses = db.query(KPIResponse).filter(
        KPIResponse.assignment_id == assignment_id
    ).all()
    form_questions = assignment.form.questions

    score_value = calculate_kpi_score(all_responses, form_questions)

    kpi_score = KPIScore(
        assignment_id=assignment_id,
        employee_id=current_user.id,
        form_id=assignment.form_id,
        score=score_value,
        calculated_at=datetime.now(timezone.utc)
    )
    db.add(kpi_score)

    # Mark assignment done
    assignment.is_submitted = True
    assignment.submitted_at = datetime.now(timezone.utc)

    db.commit()
    
    # Recalculate total KPI for the employee
    try:
        sync_kpi_scores(db, current_user.id)
    except Exception as e:
        print(f"Error syncing KPI for user {current_user.id}: {e}")

    return {"message": "Form submitted successfully", "your_score": score_value}


# ─── Admin: Get All Assignments for a Form ────────────────────────────────────

@router.get("/{form_id}/assignments", response_model=List[KPIAssignmentResponse])
def get_form_assignments(
    form_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """View all assignments and submission status for a form."""
    assignments = db.query(KPIFormAssignment).filter(
        KPIFormAssignment.form_id == form_id
    ).all()

    result = []
    for a in assignments:
        employee = db.query(User).filter(User.id == a.employee_id).first()
        kpi_score_obj = db.query(KPIScore).filter(KPIScore.assignment_id == a.id).first()
        result.append({
            **{c.name: getattr(a, c.name) for c in a.__table__.columns},
            "form_title": a.form.title if a.form else None,
            "employee_name": employee.name if employee else "Unknown",
            "score": kpi_score_obj.score if kpi_score_obj else None
        })
    return result


# ─── Analytics: Company-wide KPI ─────────────────────────────────────────────

@router.get("/analytics/overview")
def kpi_analytics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """Get company-wide KPI analytics from form submissions."""
    total_forms = db.query(KPIForm).count()
    total_assignments = db.query(KPIFormAssignment).count()
    submitted = db.query(KPIFormAssignment).filter(KPIFormAssignment.is_submitted == True).count()
    completion_rate = round((submitted / total_assignments * 100) if total_assignments > 0 else 0, 1)

    # Per-employee average scores
    all_scores = db.query(KPIScore).all()
    employee_scores: dict = {}
    for s in all_scores:
        if s.employee_id not in employee_scores:
            employee_scores[s.employee_id] = []
        employee_scores[s.employee_id].append(s.score)

    employee_analytics = []
    for emp_id, scores in employee_scores.items():
        employee = db.query(User).filter(User.id == emp_id).first()
        if employee:
            employee_analytics.append({
                "employee_id": emp_id,
                "employee_name": employee.name,
                "average_score": round(sum(scores) / len(scores), 1),
                "submissions_count": len(scores),
                "latest_score": scores[-1]
            })

    employee_analytics.sort(key=lambda x: x["average_score"], reverse=True)

    avg_company_score = round(
        sum(e["average_score"] for e in employee_analytics) / len(employee_analytics), 1
    ) if employee_analytics else 0

    return {
        "total_forms": total_forms,
        "total_assignments": total_assignments,
        "completion_rate": completion_rate,
        "average_company_score": avg_company_score,
        "top_performers": employee_analytics[:5],
        "low_performers": list(reversed(employee_analytics))[:5],
        "all_employees": employee_analytics
    }


# ─── Employee KPI History ─────────────────────────────────────────────────────

@router.get("/scores/me", response_model=List[KPIScoreResponse])
def get_my_scores(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get the current user's personal KPI score history."""
    scores = db.query(KPIScore).filter(
        KPIScore.employee_id == current_user.id
    ).order_by(KPIScore.calculated_at).all()

    result = []
    for s in scores:
        form = db.query(KPIForm).filter(KPIForm.id == s.form_id).first()
        result.append({
            **{c.name: getattr(s, c.name) for c in s.__table__.columns},
            "form_title": form.title if form else "Unknown"
        })
    return result

@router.post("/reset-kpi")
def reset_kpi(
    *,
    db: Session = Depends(deps.get_db),
    employee_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Reset KPI scores and metrics for an individual or the entire company. Admin only."""
    from db.models import KPIScore, KPIMetric
    if employee_id:
        db.query(KPIScore).filter(KPIScore.employee_id == employee_id).delete()
        db.query(KPIMetric).filter(KPIMetric.employee_id == employee_id).delete()
        db.commit()
        sync_kpi_scores(db, employee_id)
        message = f"KPI reset and recalculated for employee {employee_id}"
    else:
        db.query(KPIScore).delete()
        db.query(KPIMetric).delete()
        db.commit()
        sync_all_kpis(db)
        message = "KPI reset and recalculated for all individuals and the company"
    
    return {"message": message}
