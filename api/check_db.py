from db.session import SessionLocal
from db.models import User
from core.config import settings

print(f"Connecting to: {settings.SQLALCHEMY_DATABASE_URI}")

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Successfully connected! Found {len(users)} users:")
    for user in users:
        print(f"- {user.email} ({user.role.value})")
except Exception as e:
    print("Error connecting to database:", e)
finally:
    db.close()
