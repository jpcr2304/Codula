from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shared.databasesetup import Notification, User as UserModel, get_db
from users_service.users import get_current_user
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(tags=["notifications"])

class NotificationOut(BaseModel):
    id: int
    type: str
    created_at: datetime
    read: int
    post_id: int | None
    comment_id: int | None
    actor: dict

    class Config:
        orm_mode = True

@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return [
        NotificationOut(
            id=n.id,
            type=n.type,
            created_at=n.created_at,
            read=n.read,
            post_id=n.post_id,
            comment_id=n.comment_id,
            actor={
                "username": n.actor.username,
                "name": f"{n.actor.firstname} {n.actor.lastname}",
                "image_url": n.actor.image_url
            }
        )
        for n in notifs
    ]

@router.post("/notifications/{notif_id}/read")
def mark_as_read(notif_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    notif = db.query(Notification).filter_by(id=notif_id, recipient_id=current_user.id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.read = 1
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/notifications/mark-all-read")
def mark_all_read(current_user=Depends(get_current_user), db=Depends(get_db)):
    db.query(Notification).filter_by(recipient_id=current_user.id).update({Notification.read: 1})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/notifications/opened")
def mark_notif_opened(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    current_user.last_notif_open = datetime.utcnow()
    print(f"[DEBUG] Set last_notif_open to: {current_user.last_notif_open}")  # 👈
    db.commit()
    return {"status": "ok"}

@router.get("/me")
def get_me(current_user: UserModel = Depends(get_current_user)):
    return {"last_notif_open": current_user.last_notif_open}
