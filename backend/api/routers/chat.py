from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from datetime import datetime, timezone
from api import deps
from db.models import ChatMessage, User
from schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatMessageUpdate

router = APIRouter()

@router.post("/", response_model=ChatMessageResponse)
def send_message(
    *,
    db: Session = Depends(deps.get_db),
    msg_in: ChatMessageCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Send a chat message (Group if recipient_id is NULL, otherwise DM)."""
    if not msg_in.message and not msg_in.attachment_url:
        raise HTTPException(status_code=400, detail="Message or attachment required.")

    chat_msg = ChatMessage(
        user_id=current_user.id,
        recipient_id=msg_in.recipient_id,
        message=msg_in.message,
        attachment_url=msg_in.attachment_url,
        attachment_type=msg_in.attachment_type,
        is_read=False # For recipient
    )
    db.add(chat_msg)
    
    # If it's a group message, we update the sender's last_group_read_at to now
    if not msg_in.recipient_id:
        current_user.last_group_read_at = datetime.utcnow()
        
    db.commit()
    db.refresh(chat_msg)

    recipient_name = None
    if msg_in.recipient_id:
        recipient = db.query(User).filter(User.id == msg_in.recipient_id).first()
        recipient_name = recipient.name if recipient else None

    return ChatMessageResponse(
        id=chat_msg.id,
        user_id=chat_msg.user_id,
        user_name=current_user.name,
        user_role=current_user.role.value,
        recipient_id=chat_msg.recipient_id,
        recipient_name=recipient_name,
        message=chat_msg.message,
        attachment_url=chat_msg.attachment_url,
        attachment_type=chat_msg.attachment_type,
        timestamp=chat_msg.timestamp.replace(tzinfo=timezone.utc),
        is_edited=chat_msg.is_edited,
        is_deleted=chat_msg.is_deleted,
        is_read=chat_msg.is_read
    )

@router.get("/", response_model=List[ChatMessageResponse])
def get_group_messages(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 200,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get group chat messages."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.recipient_id == None)
        .order_by(ChatMessage.timestamp.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for m in messages:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append(
            ChatMessageResponse(
                id=m.id,
                user_id=m.user_id,
                user_name=user.name if user else "Unknown",
                user_role=user.role.value if user else "EMPLOYEE",
                message="[Message deleted]" if m.is_deleted else m.message,
                attachment_url=None if m.is_deleted else m.attachment_url,
                attachment_type=None if m.is_deleted else m.attachment_type,
                timestamp=m.timestamp.replace(tzinfo=timezone.utc),
                is_edited=m.is_edited,
                edited_at=m.edited_at.replace(tzinfo=timezone.utc) if m.edited_at else None,
                is_deleted=m.is_deleted,
                is_read=True # Group messages are handled by timestamp
            )
        )
    return result

@router.get("/dm/{user_id}", response_model=List[ChatMessageResponse])
def get_dm_history(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get private DM history."""
    messages = (
        db.query(ChatMessage)
        .filter(
            or_(
                and_(ChatMessage.user_id == current_user.id, ChatMessage.recipient_id == user_id),
                and_(ChatMessage.user_id == user_id, ChatMessage.recipient_id == current_user.id)
            )
        )
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )

    result = []
    other_user = db.query(User).filter(User.id == user_id).first()
    other_name = other_user.name if other_user else "Unknown"

    for m in messages:
        sender = current_user if m.user_id == current_user.id else other_user
        result.append(
            ChatMessageResponse(
                id=m.id,
                user_id=m.user_id,
                user_name=sender.name if sender else "Unknown",
                user_role=sender.role.value if sender else "EMPLOYEE",
                recipient_id=m.recipient_id,
                recipient_name=current_user.name if m.recipient_id == current_user.id else other_name,
                message="[Message deleted]" if m.is_deleted else m.message,
                attachment_url=None if m.is_deleted else m.attachment_url,
                attachment_type=None if m.is_deleted else m.attachment_type,
                timestamp=m.timestamp.replace(tzinfo=timezone.utc),
                is_edited=m.is_edited,
                edited_at=m.edited_at.replace(tzinfo=timezone.utc) if m.edited_at else None,
                is_deleted=m.is_deleted,
                is_read=m.is_read
            )
        )
    return result

@router.get("/inbox")
def get_inbox(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get list of recent DM conversations with unread status."""
    sent_to = db.query(ChatMessage.recipient_id).filter(ChatMessage.user_id == current_user.id, ChatMessage.recipient_id != None).distinct().all()
    received_from = db.query(ChatMessage.user_id).filter(ChatMessage.recipient_id == current_user.id).distinct().all()
    
    user_ids = set([r[0] for r in sent_to] + [r[0] for r in received_from])
    
    inbox = []
    for uid in user_ids:
        latest = db.query(ChatMessage).filter(
            or_(
                and_(ChatMessage.user_id == current_user.id, ChatMessage.recipient_id == uid),
                and_(ChatMessage.user_id == uid, ChatMessage.recipient_id == current_user.id)
            )
        ).order_by(ChatMessage.timestamp.desc()).first()
        
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.user_id == uid,
            ChatMessage.recipient_id == current_user.id,
            ChatMessage.is_read == False,
            ChatMessage.is_deleted == False
        ).count()
        
        user = db.query(User).filter(User.id == uid).first()
        if user and latest:
            inbox.append({
                "user_id": user.id,
                "user_name": user.name,
                "user_role": user.role.value,
                "last_message": latest.message if not latest.is_deleted else "Message deleted",
                "timestamp": latest.timestamp.replace(tzinfo=timezone.utc),
                "has_unread": unread_count > 0,
                "unread_count": unread_count
            })
    
    # Also add group chat status
    latest_group = db.query(ChatMessage).filter(ChatMessage.recipient_id == None).order_by(ChatMessage.timestamp.desc()).first()
    has_group_unread = False
    if latest_group:
        last_read = current_user.last_group_read_at or datetime.min
        if latest_group.timestamp > last_read and latest_group.user_id != current_user.id:
            has_group_unread = True

    return {
        "dms": sorted(inbox, key=lambda x: x["timestamp"], reverse=True),
        "group_unread": has_group_unread
    }

@router.put("/read")
def mark_as_read(
    contact_id: Optional[int] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark a DM or Group chat as read."""
    if contact_id:
        db.query(ChatMessage).filter(
            ChatMessage.user_id == contact_id,
            ChatMessage.recipient_id == current_user.id,
            ChatMessage.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
    else:
        # Group chat
        current_user.last_group_read_at = datetime.utcnow()
    
    db.commit()
    return {"status": "success"}

@router.put("/{msg_id}", response_model=ChatMessageResponse)
def edit_message(
    msg_id: int,
    msg_update: ChatMessageUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Edit own message."""
    msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.user_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or not authorized.")
    
    msg.message = msg_update.message
    msg.is_edited = True
    msg.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    
    return ChatMessageResponse(
        id=msg.id,
        user_id=msg.user_id,
        user_name=current_user.name,
        user_role=current_user.role.value,
        message=msg.message,
        timestamp=msg.timestamp.replace(tzinfo=timezone.utc),
        is_edited=msg.is_edited,
        edited_at=msg.edited_at.replace(tzinfo=timezone.utc) if msg.edited_at else None,
        is_deleted=msg.is_deleted,
        is_read=msg.is_read
    )

@router.delete("/{msg_id}")
def unsend_message(
    msg_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Soft-delete own message."""
    msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.user_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or not authorized.")
    
    msg.is_deleted = True
    db.commit()
    return {"status": "success"}

@router.delete("/admin/clear")
def clear_messages(
    scope: str = Query(..., regex="^(group|dm_all|dm_user)$"),
    target_user_id: Optional[int] = None,
    before_date: Optional[datetime] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Admin-only: clear messages."""
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can clear messages.")
    
    query = db.query(ChatMessage)
    
    if scope == "group":
        query = query.filter(ChatMessage.recipient_id == None)
    elif scope == "dm_all":
        query = query.filter(ChatMessage.recipient_id != None)
    elif scope == "dm_user" and target_user_id:
        query = query.filter(or_(ChatMessage.user_id == target_user_id, ChatMessage.recipient_id == target_user_id))
    
    if before_date:
        query = query.filter(ChatMessage.timestamp < before_date)
    
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": count}

@router.get("/users")
def get_chat_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all users."""
    users = db.query(User).filter(User.id != current_user.id).all()
    return [{
        "id": u.id,
        "name": u.name,
        "role": u.role.value,
        "designation": u.designation
    } for u in users]
