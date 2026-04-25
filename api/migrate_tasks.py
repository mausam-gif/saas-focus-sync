import sqlite3
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(base_dir, "employee_monitoring.db")

print(f"Connecting to database at: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding started_at column...")
    cursor.execute("ALTER TABLE tasks ADD COLUMN started_at DATETIME")
except sqlite3.OperationalError as e:
    print(f"Error adding started_at: {e} (might already exist)")

try:
    print("Adding completion_notes column...")
    cursor.execute("ALTER TABLE tasks ADD COLUMN completion_notes TEXT")
except sqlite3.OperationalError as e:
    print(f"Error adding completion_notes: {e} (might already exist)")

conn.commit()
conn.close()
print("Migration completed.")
