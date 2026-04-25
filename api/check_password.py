import sqlite3
from core.security import verify_password, get_password_hash

conn = sqlite3.connect('employee_monitoring.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT email, hashed_password FROM users WHERE email='admin@focussync.com'")
    row = cursor.fetchone()
    if row:
        email, hashed_password = row
        print(f"Testing password for {email}...")
        is_valid = verify_password("admin123", hashed_password)
        print("Is Valid:", is_valid)
    else:
        print("User not found.")
except Exception as e:
    print("Error:", e)

conn.close()
