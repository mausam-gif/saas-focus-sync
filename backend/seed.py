import asyncio
import sqlite3
import os
from sqlalchemy.orm import Session
from core.security import get_password_hash
from db.session import SessionLocal, engine
from db.models import Base, User, Project, Task, KPIMetric
from datetime import datetime, timedelta

def migrate_schema():
    print("Running automated schema migration...")
    db_path = "employee_monitoring.db"
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Add columns to 'users' table
    for col_name, col_type in [("unit", "VARCHAR"), ("phone", "VARCHAR"), ("location", "VARCHAR"), ("designation", "VARCHAR")]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    # 2. Add columns to 'projects' table
    projects_cols = [
        ("client_id", "INTEGER"), ("shooting_date", "DATETIME"), ("delivery_date", "DATETIME"),
        ("service_category", "VARCHAR"), ("client_value_proposition", "TEXT"),
        ("total_budget", "FLOAT"), ("current_spend", "FLOAT"), ("resource_allocation", "TEXT"),
        ("problem_solved", "TEXT"), ("shooting_fee", "FLOAT"), ("editing_fee", "FLOAT"), ("the_hook", "TEXT")
    ]
    for col_name, col_type in projects_cols:
        try:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    # 3. Add columns to 'clients' table
    for col_name, col_type in [("referral_source_other", "VARCHAR")]:
        try:
            cursor.execute(f"ALTER TABLE clients ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()
    print("Automated schema migration complete.")

def seed_db():
    migrate_schema()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if users exist
    if db.query(User).first():
        print("Database already seeded.")
        return

    # Create Users
    admin = User(email="admin@focussync.com", hashed_password=get_password_hash("admin123"), name="Admin User", role="ADMIN")
    manager = User(email="manager@focussync.com", hashed_password=get_password_hash("manager123"), name="Sarah Manager", role="MANAGER")
    e1 = User(email="e1@focussync.com", hashed_password=get_password_hash("pass"), name="John Doe", role="EMPLOYEE")
    e2 = User(email="e2@focussync.com", hashed_password=get_password_hash("pass"), name="Jane Smith", role="EMPLOYEE")
    e3 = User(email="e3@focussync.com", hashed_password=get_password_hash("pass"), name="Mike Johnson", role="EMPLOYEE")
    
    db.add_all([admin, manager, e1, e2, e3])
    db.commit()

    # Create Projects
    p1 = Project(name="Q1 Marketing Site Update", start_date=datetime.now(), deadline=datetime.now() + timedelta(days=30))
    p2 = Project(name="Mobile App MVP", start_date=datetime.now(), deadline=datetime.now() + timedelta(days=60))
    p3 = Project(name="Database Migration", start_date=datetime.now() - timedelta(days=30), deadline=datetime.now())
    
    db.add_all([p1, p2, p3])
    db.commit()

    # Create Tasks
    t1 = Task(project_id=p1.id, assigned_user=e1.id, status="DONE")
    t2 = Task(project_id=p1.id, assigned_user=e2.id, status="IN_PROGRESS")
    t3 = Task(project_id=p2.id, assigned_user=e3.id, status="TODO")
    
    db.add_all([t1, t2, t3])
    db.commit()

    # Create KPIs
    kpi1 = KPIMetric(employee_id=e1.id, productivity_score=88.5, task_completion_rate=95.0, efficiency_score=82.0)
    kpi2 = KPIMetric(employee_id=e2.id, productivity_score=92.0, task_completion_rate=100.0, efficiency_score=90.0)
    kpi3 = KPIMetric(employee_id=e3.id, productivity_score=75.0, task_completion_rate=80.0, efficiency_score=70.0)
    
    db.add_all([kpi1, kpi2, kpi3])
    db.commit()

    print("Successfully seeded database with users, projects, tasks, and KPIs!")
    db.close()

if __name__ == "__main__":
    seed_db()
