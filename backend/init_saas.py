import os
from sqlalchemy import create_engine
from db.session import engine
from db.models import Base, User, Organization, UserRole
from sqlalchemy.orm import sessionmaker
from core.security import get_password_hash
from dotenv import load_dotenv

load_dotenv()

def init_db():
    print("Dropping all existing tables for a clean start...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables in Supabase...")
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if Super Admin already exists
        super_admin_email = "mausamban9@gmail.com"
        existing_user = db.query(User).filter(User.email == super_admin_email).first()
        
        if not existing_user:
            print(f"Creating Super Admin account: {super_admin_email}")
            super_admin = User(
                email=super_admin_email,
                hashed_password=get_password_hash("Admin@1234"), # Initial temporary password
                name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True
            )
            db.add(super_admin)
            db.commit()
            print("Super Admin created successfully!")
        else:
            print("Super Admin already exists.")
            
    except Exception as e:
        print(f"Error during initialization: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
