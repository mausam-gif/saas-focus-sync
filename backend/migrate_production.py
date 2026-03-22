import sqlite3
import os

def migrate():
    db_path = "employee_monitoring.db" 
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Checking for missing columns and tables...")

    # 1. Add columns to 'users' table if they don't exist
    columns_to_add = [
        ("unit", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("location", "VARCHAR")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Added column '{col_name}' to 'users' table.")
        except sqlite3.OperationalError:
            print(f"Column '{col_name}' already exists in 'users' table.")

    # 2. Add columns to 'projects' table
    projects_cols = [
        ("client_id", "INTEGER"),
        ("shooting_date", "DATETIME"),
        ("delivery_date", "DATETIME"),
        ("service_category", "VARCHAR"),
        ("client_value_proposition", "TEXT"),
        ("total_budget", "FLOAT"),
        ("current_spend", "FLOAT"),
        ("resource_allocation", "TEXT"),
        ("problem_solved", "TEXT"),
        ("shooting_fee", "FLOAT"),
        ("editing_fee", "FLOAT"),
        ("the_hook", "TEXT")
    ]
    
    for col_name, col_type in projects_cols:
        try:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            print(f"Added column '{col_name}' to 'projects' table.")
        except sqlite3.OperationalError:
            print(f"Column '{col_name}' already exists in 'projects' table.")

    # 3. Create 'clients' table if it doesn't exist
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name VARCHAR NOT NULL,
                primary_contact_name VARCHAR NOT NULL,
                primary_contact_role VARCHAR,
                phone VARCHAR,
                whatsapp VARCHAR,
                email VARCHAR,
                location VARCHAR,
                facebook_url VARCHAR,
                tiktok_url VARCHAR,
                instagram_url VARCHAR,
                referral_source VARCHAR,
                birthday DATETIME,
                anniversary DATETIME,
                follow_up_date DATETIME,
                upsell_potential TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL,
                FOREIGN KEY(created_by) REFERENCES users(id)
            )
        """)
        print("Ensured 'clients' table exists.")
    except Exception as e:
        print(f"Error creating clients table: {e}")

    conn.commit()
    conn.close()
    print("Migration sequence complete.")

if __name__ == "__main__":
    migrate()
