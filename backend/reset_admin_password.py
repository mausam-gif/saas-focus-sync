from core.security import get_password_hash
from db.session import SessionLocal
from db.models import User
import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def reset_password(email, new_password):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"User {email} not found.")
        db.close()
        return

    user.hashed_password = get_password_hash(new_password)
    db.commit()
    print(f"Password for {email} reset successfully.")
    db.close()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        reset_password(sys.argv[1], sys.argv[2])
    else:
        reset_password("admin@focussync.com", "admin123")
        reset_password("mausamban9@gmail.com", "admin123")
