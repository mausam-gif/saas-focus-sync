from db.session import SessionLocal
from db.models import User, UserRole

def debug_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"{'ID':<5} | {'Email':<30} | {'Role':<15} | {'OrgID':<5} | {'Name':<20}")
        print("-" * 85)
        for u in users:
            print(f"{u.id:<5} | {u.email:<30} | {u.role:<15} | {str(u.organization_id):<5} | {u.name:<20}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_users()
