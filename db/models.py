import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class UserUnit(str, enum.Enum):
    PRODUCTION = "PRODUCTION"
    CREATIVE_AND_STRATEGY = "CREATIVE_AND_STRATEGY"
    GROWTH_AND_ENGAGEMENT = "GROWTH_AND_ENGAGEMENT"
    TEAM_DEVELOPMENT = "TEAM_DEVELOPMENT"

class ReferralSource(str, enum.Enum):
    DIRECT_WALK_IN = "DIRECT_WALK_IN"
    FACEBOOK_AD = "FACEBOOK_AD"
    FRIEND = "FRIEND"
    OTHER = "OTHER"

class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    subscription_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    users = relationship("User", back_populates="organization")
    units = relationship("OrganizationUnit", back_populates="organization", cascade="all, delete-orphan")
    project_steps = relationship("ProjectStep", back_populates="organization", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="organization")
    projects = relationship("Project", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    unit = Column(String, nullable=True) # Now dynamic per organization
    unit_id = Column(Integer, ForeignKey("organization_units.id"), nullable=True)
    phone = Column(String, nullable=True)  # WhatsApp
    location = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True) # SuperAdmins might not belong to one
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    last_group_read_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    manager = relationship("User", remote_side=[id], backref="employees")
    tasks = relationship("Task", back_populates="user", foreign_keys="Task.assigned_user")
    work_submissions = relationship("WorkSubmission", back_populates="employee")
    kpi_metrics = relationship("KPIMetric", back_populates="employee", uselist=False)
    clients_created = relationship("Client", back_populates="creator")
    organization_unit = relationship("OrganizationUnit")

class OrganizationUnit(Base):
    __tablename__ = "organization_units"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    organization = relationship("Organization", back_populates="units")

class ProjectStep(Base):
    __tablename__ = "project_steps"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#4F46E5") # Default indigo
    order = Column(Integer, default=0)
    organization = relationship("Organization", back_populates="project_steps")
    automations = relationship("StepAutomation", back_populates="step", cascade="all, delete-orphan")

class StepAutomation(Base):
    __tablename__ = "step_automations"
    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("project_steps.id"), nullable=False)
    designation = Column(String, nullable=False) # e.g. "manager", "designer"
    task_title = Column(String, nullable=False)
    task_description = Column(Text, nullable=True)
    step = relationship("ProjectStep", back_populates="automations")

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, index=True, nullable=False)
    primary_contact_name = Column(String, index=True, nullable=False)
    primary_contact_role = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    email = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    # Social Media
    facebook_url = Column(String, nullable=True)
    tiktok_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    
    referral_source = Column(SQLEnum(ReferralSource), default=ReferralSource.OTHER)
    referral_source_other = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    birthday = Column(DateTime, nullable=True)
    anniversary = Column(DateTime, nullable=True)
    
    follow_up_date = Column(DateTime, nullable=True)
    upsell_potential = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    organization = relationship("Organization", back_populates="clients")
    creator = relationship("User", back_populates="clients_created")
    projects = relationship("Project", back_populates="client")
    documents = relationship("ClientDocument", back_populates="client", cascade="all, delete-orphan")

class ClientDocument(Base):
    __tablename__ = "client_documents"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    client = relationship("Client", back_populates="documents")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    start_date = Column(DateTime, nullable=False)
    shooting_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True) # Renamed from deadline potentially or added
    deadline = Column(DateTime, nullable=False)
    
    status = Column(String, default="ANALYSIS", nullable=False)
    service_category = Column(String, nullable=True) # e.g. Cinematic Car Shoot
    
    # Foundational / During
    client_value_proposition = Column(Text, nullable=True)
    total_budget = Column(Float, nullable=True)  # in NPR
    current_spend = Column(Float, nullable=True)
    resource_allocation = Column(Text, nullable=True) # Who is on-site
    
    # After Completion (Intelligence)
    problem_solved = Column(Text, nullable=True)
    shooting_fee = Column(Float, nullable=True)
    editing_fee = Column(Float, nullable=True)
    the_hook = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    project_step_id = Column(Integer, ForeignKey("project_steps.id"), nullable=True)

    organization = relationship("Organization", back_populates="projects")
    client = relationship("Client", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    work_submissions = relationship("WorkSubmission", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("ProjectDocument", back_populates="project", cascade="all, delete-orphan")
    notes = relationship("Note", backref="project")
    project_step = relationship("ProjectStep")

class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    project = relationship("Project", back_populates="documents")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Task")
    description = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # optional project link
    assigned_user = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)   # who sent the task
    due_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    progress = Column(Integer, default=0)  # 0 to 100
    completed_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

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
    timestamp = Column(DateTime, default=datetime.now)

    question = relationship("Question", back_populates="responses")
    employee = relationship("User", foreign_keys=[employee_id])

class WorkSubmission(Base):
    __tablename__ = "work_submissions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_url = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.now)

    employee = relationship("User", foreign_keys=[employee_id], back_populates="work_submissions")
    project = relationship("Project", back_populates="work_submissions")

class KPIMetric(Base):
    __tablename__ = "kpi_metrics"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    productivity_score = Column(Float, default=0.0)
    task_completion_rate = Column(Float, default=0.0)
    efficiency_score = Column(Float, default=0.0)
    task_score = Column(Float, default=0.0)
    project_score = Column(Float, default=0.0)
    form_score = Column(Float, default=0.0)

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
    created_at = Column(DateTime, default=datetime.now)

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
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for company-wide templates
    is_company_wide = Column(Boolean, default=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    is_submitted = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

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
    submitted_at = Column(DateTime, default=datetime.now)

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
    calculated_at = Column(DateTime, default=datetime.now)

    assignment = relationship("KPIFormAssignment", back_populates="score")
    employee = relationship("User", foreign_keys=[employee_id])
    form = relationship("KPIForm", foreign_keys=[form_id])

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    is_reminder = Column(Boolean, default=False)
    reminder_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    message = Column(Text, nullable=True)
    attachment_url = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", foreign_keys=[user_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
