from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import Question, Response, User, UserRole, Task
from schemas.question import QuestionCreate, QuestionResponse, ResponseCreate, ResponseResponse
import os
import google.generativeai as genai

router = APIRouter()

@router.post("/", response_model=QuestionResponse)
def create_question(
    *,
    db: Session = Depends(deps.get_db),
    question_in: QuestionCreate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Create a new question/message. Manager or Admin can ask questions.
    Must include at least a question_text or an attachment_url.
    """
    if not question_in.question_text and not question_in.attachment_url:
        raise HTTPException(status_code=400, detail="Must provide either a question text or an attachment.")

    if current_user.role == UserRole.MANAGER:
        target_user = db.query(User).filter(User.id == question_in.target_employee).first()
        if not target_user or target_user.role != UserRole.EMPLOYEE:
            raise HTTPException(status_code=403, detail="Can only ask employees questions")

    question = Question(
        created_by=current_user.id,
        target_employee=question_in.target_employee,
        question_text=question_in.question_text,
        attachment_url=question_in.attachment_url,
        attachment_type=question_in.attachment_type,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/", response_model=List[QuestionResponse])
def read_questions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve questions.
    """
    if current_user.role == UserRole.ADMIN:
        questions = db.query(Question).offset(skip).limit(limit).all()
    elif current_user.role == UserRole.MANAGER:
        questions = db.query(Question).filter(Question.created_by == current_user.id).offset(skip).limit(limit).all()
    else:
        questions = db.query(Question).filter(Question.target_employee == current_user.id).offset(skip).limit(limit).all()
    
    # Map creator and responses to each question
    result = []
    for q in questions:
        creator_user = db.query(User).filter(User.id == q.created_by).first()
        q_dict = {
            "id": q.id,
            "created_by": q.created_by,
            "target_employee": q.target_employee,
            "question_text": q.question_text,
            "creator": {
                "id": creator_user.id,
                "name": creator_user.name,
                "role": creator_user.role.value
            } if creator_user else {
                "id": 0, "name": "Unknown", "role": "MANAGER"
            },
            "responses": [
                {
                    "id": r.id,
                    "response_text": r.response_text,
                    "question_id": r.question_id,
                    "employee_id": r.employee_id,
                    "employee_name": db.query(User).filter(User.id == r.employee_id).first().name if db.query(User).filter(User.id == r.employee_id).first() else "Unknown Employee",
                    "timestamp": r.timestamp
                } for r in q.responses
            ]
        }
        result.append(q_dict)

    return result

@router.post("/{question_id}/responses", response_model=ResponseResponse)
def create_response(
    *,
    db: Session = Depends(deps.get_db),
    question_id: int,
    response_in: ResponseCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Answer a question. Only the target employee can answer.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.target_employee != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to answer this question")

    response = Response(
        question_id=question_id,
        employee_id=current_user.id,
        response_text=response_in.response_text
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    # Automatically recalculate KPI metrics here if needed
    return response

@router.post("/generate/{employee_id}")
def generate_question(
    employee_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Generate a check-in question using Gemini API based on employee's recent activity.
    """
    # Fetch employee context
    tasks = db.query(Task).filter(Task.assigned_user == employee_id).all()
    
    task_context = "No tasks assigned."
    if tasks:
        task_context = f"The employee has {len(tasks)} tasks: " + ", ".join([f"id {t.id} ({t.status.value})" for t in tasks])
    
    if not os.getenv("GEMINI_API_KEY"):
        # Fallback if no key is set
        return {"question_text": f"MOCK AI: I see you have some tasks. {task_context} What blockers are you facing today?"}
        
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        You are an AI assistant helping a manager create a personalized, 1-2 sentence check-in question for an employee.
        Employee context: {task_context}.
        Generate a thoughtful, constructive question that asks about their progress, blockers, or KPIs.
        Return ONLY the question text.
        """
        response = model.generate_content(prompt)
        return {"question_text": response.text.replace('"', '').strip()}
    except Exception as e:
        return {"question_text": f"Error generating question: {str(e)}"}
