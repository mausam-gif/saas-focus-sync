from sqlalchemy import text
from db.session import engine

def migrate():
    commands = [
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'taskpriority') THEN CREATE TYPE taskpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); END IF; END $$;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority taskpriority DEFAULT 'MEDIUM' NOT NULL;"
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                conn.execute(text(cmd))
                print(f"Executed: {cmd[:50]}...")
            except Exception as e:
                print(f"Error: {e}")
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
