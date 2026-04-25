from .db.session import SessionLocal
from .db.models import KPIForm, KPIQuestion, KPIQuestionType
import sys
import os

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_eval_form():
    db = SessionLocal()
    existing = db.query(KPIForm).filter(KPIForm.title.ilike("%Evaluation%")).first()
    if existing:
        print(f"Form '{existing.title}' already exists.")
        db.close()
        return

    eval_form = KPIForm(
        title="Project Evaluation Form",
        description="Standard evaluation for completed project stages.",
        created_by=1, # Admin
        is_active=True
    )
    db.add(eval_form)
    db.flush()

    q1 = KPIQuestion(form_id=eval_form.id, question_text="How would you rate the overall project quality?", question_type=KPIQuestionType.RATING, weight=0.4, order=0)
    q2 = KPIQuestion(form_id=eval_form.id, question_text="Was the timeline followed strictly?", question_type=KPIQuestionType.RATING, weight=0.3, order=1)
    q3 = KPIQuestion(form_id=eval_form.id, question_text="Any challenges faced during execution?", question_type=KPIQuestionType.TEXT, weight=0.3, order=2)
    db.add_all([q1, q2, q3])

    db.commit()
    print("Project Evaluation Form created successfully.")
    db.close()

if __name__ == "__main__":
    create_eval_form()
