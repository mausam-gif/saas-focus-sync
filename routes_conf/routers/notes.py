from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routes_conf import deps
from db.models import Note, User
from schemas.note import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter()

@router.post("/", response_model=NoteResponse)
def create_note(
    *,
    db: Session = Depends(deps.get_db),
    note_in: NoteCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    note = Note(
        **note_in.model_dump(),
        user_id=current_user.id
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/", response_model=List[NoteResponse])
def read_notes(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    return db.query(Note).filter(Note.user_id == current_user.id).all()

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    *,
    db: Session = Depends(deps.get_db),
    note_id: int,
    note_in: NoteUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)
    
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
def delete_note(
    *,
    db: Session = Depends(deps.get_db),
    note_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
