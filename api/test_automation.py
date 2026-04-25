from .db.session import SessionLocal
from .db.models import Project, Task, KPIFormAssignment, User
from .api.utils.automation import trigger_project_automation
from datetime import datetime, timedelta, timezone
import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_automation():
    db = SessionLocal()
    
    # 1. Get User (Designer)
    user = db.query(User).filter(User.email == "mausamban9@gmail.com").first()
    if not user or user.designation != "Designer":
        print(f"Error: User not found or designation not 'Designer' (was: {user.designation if user else 'None'})")
        db.close()
        return

    # 2. Create Project (ANALYSIS)
    project = Project(
        name="Automation Test Project",
        status="ANALYSIS",
        start_date=datetime.now(timezone.utc),
        deadline=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    print(f"Project created: {project.id}")

    # 3. Trigger Initial Automation
    print("Triggering Analysis automation...")
    trigger_project_automation(db, project, is_new=True)
    
    # Check Tasks
    tasks = db.query(Task).filter(Task.project_id == project.id, Task.assigned_user == user.id).all()
    print(f"User's tasks after ANALYSIS: {[t.title for t in tasks]}")
    assert any("Brand Audit" in t.title for t in tasks)
    assert any("Competitor Visual Analysis" in t.title for t in tasks)

    # 4. Move to STRATEGY
    print("Moving to STRATEGY automation...")
    project.status = "STRATEGY"
    db.commit()
    trigger_project_automation(db, project)

    # Check Tasks
    tasks = db.query(Task).filter(Task.project_id == project.id, Task.assigned_user == user.id).all()
    print(f"User's tasks after STRATEGY: {[t.title for t in tasks]}")
    assert any("Mood Boarding" in t.title for t in tasks)

    # 5. Move to EVALUATION
    print("Moving to EVALUATION automation...")
    project.status = "EVALUATION"
    db.commit()
    trigger_project_automation(db, project)

    # Check KPI Assignment
    kpi_assign = db.query(KPIFormAssignment).filter(KPIFormAssignment.employee_id == user.id).first()
    if kpi_assign:
        print(f"KPI Form assigned to User!")
    else:
        print("Error: KPI Form not assigned.")

    # Cleanup
    # db.delete(project)
    # db.commit()
    
    print("Test Automation successful!")
    db.close()

if __name__ == "__main__":
    test_automation()
