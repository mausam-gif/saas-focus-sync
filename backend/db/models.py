import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    manager = relationship("User", remote_side=[id], backref="employees")
    tasks = relationship("Task", back_populates="user", foreign_keys="Task.assigned_user")
    work_submissions = relationship("WorkSubmission", back_populates="employee")
    kpi_metrics = relationship("KPIMetric", back_populates="employee", uselist=False)

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    work_submissions = relationship("WorkSubmission", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Task")
    description = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # optional project link
    assigned_user = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)   # who sent the task
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    progress = Column(Integer, default=0)  # 0 to 100

    project = relationship("Project", back_populates="tasks", foreign_keys=[project_id])
    user = relationship("User", back_populates="tasks", foreign_keys=[assigned_user])
    sender = relationship("User", foreign_keys=[assigned_by])

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False) # Admin or Manager
    target_employee = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_text = Column(String, nullable=True)  # now optional (can have attachment only)
    attachment_url = Column(String, nullable=True)  # uploaded file URL
    attachment_type = Column(String, nullable=True) # 'file' | 'audio' | 'image'

    
    creator = relationship("User", foreign_keys=[created_by])
    employee = relationship("User", foreign_keys=[target_employee])
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")

class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    response_text = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("Question", back_populates="responses")
    employee = relationship("User", foreign_keys=[employee_id])

class WorkSubmission(Base):
    __tablename__ = "work_submissions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_url = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("User", foreign_keys=[employee_id], back_populates="work_submissions")
    project = relationship("Project", back_populates="work_submissions")

class KPIMetric(Base):
    __tablename__ = "kpi_metrics"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    productivity_score = Column(Float, default=0.0)
    task_completion_rate = Column(Float, default=0.0)
    efficiency_score = Column(Float, default=0.0)

    employee = relationship("User", back_populates="kpi_metrics")

# ── KPI Forms System ─────────────────────────────────────────────────────────

class KPIFrequency(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    ONE_TIME = "ONE_TIME"

class KPIQuestionType(str, enum.Enum):
    NUMERIC = "NUMERIC"
    PERCENTAGE = "PERCENTAGE"
    RATING = "RATING"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TEXT = "TEXT"

class KPIForm(Base):
    __tablename__ = "kpi_forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(SQLEnum(KPIFrequency), default=KPIFrequency.WEEKLY)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    questions = relationship("KPIQuestion", back_populates="form", cascade="all, delete-orphan", order_by="KPIQuestion.order")
    assignments = relationship("KPIFormAssignment", back_populates="form", cascade="all, delete-orphan")

class KPIQuestion(Base):
    __tablename__ = "kpi_questions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("kpi_forms.id"), nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(SQLEnum(KPIQuestionType), default=KPIQuestionType.RATING)
    weight = Column(Float, default=0.0)  # 0.0 to 1.0 (sum of all questions = 1.0)
    options = Column(Text, nullable=True)  # JSON string for multiple choice options
    order = Column(Integer, default=0)

    form = relationship("KPIForm", back_populates="questions")
    responses = relationship("KPIResponse", back_populates="question")

class KPIFormAssignment(Base):
    __tablename__ = "kpi_form_assignments"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("kpi_forms.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("KPIForm", back_populates="assignments")
    employee = relationship("User", foreign_keys=[employee_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
    responses = relationship("KPIResponse", back_populates="assignment", cascade="all, delete-orphan")
    score = relationship("KPIScore", back_populates="assignment", uselist=False)

class KPIResponse(Base):
    __tablename__ = "kpi_responses"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("kpi_form_assignments.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("kpi_questions.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, nullable=True)   # For TEXT and MULTIPLE_CHOICE answers
    numeric_value = Column(Float, nullable=True) # For NUMERIC, PERCENTAGE, RATING
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("KPIFormAssignment", back_populates="responses")
    question = relationship("KPIQuestion", back_populates="responses")
    employee = relationship("User", foreign_keys=[employee_id])

class KPIScore(Base):
    __tablename__ = "kpi_scores"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("kpi_form_assignments.id"), nullable=False, unique=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("kpi_forms.id"), nullable=False)
    score = Column(Float, nullable=False)   # 0 to 100
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("KPIFormAssignment", back_populates="score")
    employee = relationship("User", foreign_keys=[employee_id])
    form = relationship("KPIForm", foreign_keys=[form_id])

