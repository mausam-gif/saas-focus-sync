import requests

response = requests.post(
    "http://localhost:8000/api/v1/login/access-token",
    data={"username": "admin@focussync.com", "password": "admin123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
print("Status:", response.status_code)
print("Body:", response.text)
