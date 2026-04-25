from fastapi import APIRouter
from routers import (
    users, projects, tasks, questions, submissions, 
    analytics, auth, kpi_forms, upload, clients, notes, chat, super_admin
)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["super-admin"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(kpi_forms.router, prefix="/kpi-forms", tags=["kpi-forms"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
