from sqlalchemy import text
from db.session import engine

def migrate():
    print("Starting migration...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Adding unit_id to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES organization_units(id)"))
            
            print("Adding project_step_id to projects table...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_step_id INTEGER REFERENCES project_steps(id)"))
            
            trans.commit()
            print("Migration completed successfully.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()
