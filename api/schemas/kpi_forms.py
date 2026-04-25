from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Question Schemas ──────────────────────────────────────────────────────────

class KPIQuestionCreate(BaseModel):
    question_text: str
    question_type: str  # NUMERIC, PERCENTAGE, RATING, MULTIPLE_CHOICE, TEXT
    weight: float       # 0.0 to 1.0
    options: Optional[str] = None  # JSON string for MC options
    order: int = 0

class KPIQuestionResponse(KPIQuestionCreate):
    id: int
    form_id: int
    model_config = {"from_attributes": True}


# ── Form Schemas ──────────────────────────────────────────────────────────────

class KPIFormCreate(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: str = "WEEKLY"  # DAILY, WEEKLY, MONTHLY, ONE_TIME
    questions: List[KPIQuestionCreate] = []

class KPIFormResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    frequency: str
    created_by: int
    is_active: bool
    created_at: datetime
    questions: List[KPIQuestionResponse] = []
    creator_name: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Assignment Schemas ────────────────────────────────────────────────────────

class AssignFormRequest(BaseModel):
    employee_ids: List[int] = []
    is_company_wide: bool = False
    due_date: Optional[datetime] = None

class KPIAssignmentResponse(BaseModel):
    id: int
    form_id: int
    employee_id: Optional[int] = None
    is_company_wide: bool = False
    employee_name: Optional[str] = None
    assigned_by: int
    due_date: Optional[datetime]
    is_submitted: bool
    submitted_at: Optional[datetime]
    created_at: datetime
    form_title: Optional[str] = None
    score: Optional[float] = None
    model_config = {"from_attributes": True}


# ── Response/Submission Schemas ───────────────────────────────────────────────

class KPIAnswerSubmit(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    numeric_value: Optional[float] = None

class KPIFormSubmitRequest(BaseModel):
    answers: List[KPIAnswerSubmit]


# ── Score and Analytics Schemas ───────────────────────────────────────────────

class KPIScoreResponse(BaseModel):
    id: int
    employee_id: int
    form_id: int
    form_title: Optional[str] = None
    score: float
    calculated_at: datetime
    model_config = {"from_attributes": True}

class EmployeeKPIAnalytics(BaseModel):
    employee_id: int
    employee_name: str
    average_score: float
    submissions_count: int
    latest_score: Optional[float]

class CompanyKPIAnalytics(BaseModel):
    total_forms: int
    total_assignments: int
    completion_rate: float
    average_company_score: float
    top_performers: List[EmployeeKPIAnalytics]
    low_performers: List[EmployeeKPIAnalytics]
