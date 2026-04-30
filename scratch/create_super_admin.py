import sys
import os
from sqlalchemy.orm import Session
from db.session import SessionLocal, engine
from db.models import User, UserRole, Base
from core.security import get_password_hash

def create_super_admin():
    db = SessionLocal()
    try:
        email = "mausamban9@gmail.com"
        password = "admin123"
        name = "Mausam Super Admin"
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists. Updating password and role to SUPER_ADMIN.")
            existing_user.hashed_password = get_password_hash(password)
            existing_user.role = UserRole.SUPER_ADMIN
            db.commit()
            print("User updated successfully.")
            return

        # Create new Super Admin
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            name=name,
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Super Admin {email} created successfully!")
        
    except Exception as e:
        print(f"Error creating super admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables exist (they should, but just in case)
    Base.metadata.create_all(bind=engine)
    create_super_admin()
