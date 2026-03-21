import sqlite3

conn = sqlite3.connect('employee_monitoring.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, email, role FROM users")
    rows = cursor.fetchall()
    print("Users in DB:")
    for row in rows:
        print(row)
except Exception as e:
    print("Error:", e)

conn.close()
