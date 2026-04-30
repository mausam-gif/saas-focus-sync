from sqlalchemy import text
from db.session import engine

def apply_indexes():
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_org_id ON users(organization_id)",
        "CREATE INDEX IF NOT EXISTS idx_project_org_id ON projects(organization_id)",
        "CREATE INDEX IF NOT EXISTS idx_task_assigned_user ON tasks(assigned_user)",
        "CREATE INDEX IF NOT EXISTS idx_task_project_id ON tasks(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_kpi_metric_employee_id ON kpi_metrics(employee_id)",
        "CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status)",
        "CREATE INDEX IF NOT EXISTS idx_project_status ON projects(status)"
    ]
    
    with engine.connect() as conn:
        for idx in indexes:
            try:
                conn.execute(text(idx))
                print(f"Applied: {idx}")
            except Exception as e:
                print(f"Failed to apply {idx}: {e}")
        conn.commit()

if __name__ == "__main__":
    apply_indexes()
