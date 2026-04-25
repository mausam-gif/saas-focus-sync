import sqlite3, requests
import sys

conn = sqlite3.connect('employee_monitoring.db')
c = conn.cursor()
c.execute("SELECT email FROM users WHERE role='ADMIN' LIMIT 1")
row = c.fetchone()
if not row:
    print("No admin user found")
    sys.exit(1)

r = requests.post("http://localhost:8000/api/v1/login/access-token", data={"username": row[0], "password": "password"})
data = r.json()
token = data.get("access_token")

if not token:
    print("Failed to login:", r.status_code, r.text)
    sys.exit(1)

r2 = requests.get("http://localhost:8000/api/v1/tasks/export/excel", headers={"Authorization": f"Bearer {token}"})
print("STATUS:", r2.status_code)
if r2.status_code != 200:
    print("ERROR:", r2.text)
else:
    print("SUCCESS: bytes length:", len(r2.content))
