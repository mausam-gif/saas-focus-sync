from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api import deps
from db.models import User, Client, UserRole
from schemas.client import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter()

@router.post("/", response_model=ClientResponse)
def create_client(
    *,
    db: Session = Depends(deps.get_db),
    client_in: ClientCreate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Create new client.
    """
    # Extract documents
    documents_data = client_in.documents or []
    client_data = client_in.model_dump(exclude={"documents"})
    
    client = Client(
        **client_data,
        created_by=current_user.id
    )
    
    # Add documents
    from db.models import ClientDocument
    for doc in documents_data:
        client.documents.append(ClientDocument(**doc.model_dump()))
        
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.get("/", response_model=List[ClientResponse])
def read_clients(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve clients.
    """
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients

@router.get("/{client_id}", response_model=ClientResponse)
def read_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get client by ID.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(deps.get_current_active_manager_or_admin),
) -> Any:
    """
    Update a client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_in.model_dump(exclude_unset=True, exclude={"documents"})
    for field, value in update_data.items():
        setattr(client, field, value)
        
    # Handle documents if provided
    if client_in.documents is not None:
        from db.models import ClientDocument
        # Clear existing and replace (simple approach)
        client.documents = [ClientDocument(**doc.model_dump()) for doc in client_in.documents]
        
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}", response_model=ClientResponse)
def delete_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a client. Admin only.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return client
