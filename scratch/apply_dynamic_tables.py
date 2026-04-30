from db.session import engine
from db.models import Base

def apply_new_tables():
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("New tables created successfully.")

if __name__ == "__main__":
    apply_new_tables()
