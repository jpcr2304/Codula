from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from shared.databasesetup import QuestionnaireAnswer, get_db, User as UserModel
from shared.databasesetup import QuestionnaireAnswer2 as QA2
from users_service.users import get_current_user

router = APIRouter(tags=["questionnaire"])

# --------- Q1 ---------

class QuestionnaireIn(BaseModel):
    navigation: Optional[str] = None
    would_use: Optional[str] = None
    easy_find: Optional[str] = None
    design: Optional[str] = None
    improve: Optional[str] = None
    desired_functionality: Optional[str] = None
    more_feedback: Optional[str] = None

    class Config:
        extra = "ignore" 

@router.post("/questionnaire")
def submit_questionnaire(
    data: QuestionnaireIn,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    payload = data.dict()
    required_fields = [
        "navigation",
        "would_use",
        "easy_find",
        "design",
        "improve",
        "desired_functionality",
        "more_feedback",
    ]
    missing = [k for k in required_fields if not payload.get(k) or str(payload.get(k)).strip() == ""]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required answers: {', '.join(missing)}")

    answer = QuestionnaireAnswer(user_id=current_user.id, **payload)
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return {"message": "Feedback submitted!", "id": answer.id}

@router.get("/questionnaire/me", response_model=QuestionnaireIn)
def get_my_questionnaire(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    answer = db.query(QuestionnaireAnswer).filter_by(user_id=current_user.id).first()
    if answer is None:
        raise HTTPException(status_code=404, detail="No questionnaire submitted yet")
    return answer

class QuestionnaireOut(BaseModel):
    id: int
    user_id: int

    navigation: Optional[str] = None
    appeal: Optional[str] = None
    would_use: Optional[str] = None
    easy_find: Optional[str] = None
    design: Optional[str] = None
    favorite_feature: Optional[str] = None
    improve: Optional[str] = None
    desired_functionality: Optional[str] = None
    more_feedback: Optional[str] = None

    class Config:
        orm_mode = True

@router.get("/questionnaire/all", response_model=List[QuestionnaireOut])
def get_all_feedback(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    return db.query(QuestionnaireAnswer).all()

# --------- Q2 ---------

class Questionnaire2In(BaseModel):
    q1: Optional[str] = None
    q2: Optional[str] = None
    q3: Optional[str] = None
    q4: Optional[str] = None
    q5: Optional[str] = None
    q6: Optional[str] = None
    q7: Optional[str] = None
    q8: Optional[str] = None
    q9: Optional[str] = None

    class Config:
        extra = "ignore"

class Questionnaire2Out(Questionnaire2In):
    id: int
    user_id: int

    class Config:
        orm_mode = True

@router.post("/questionnaire/2")
def submit_questionnaire2(
    data: Questionnaire2In,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    incoming = data.dict()
    required_qs = [f"q{i}" for i in range(1, 10)]
    missing = [k for k in required_qs if not incoming.get(k) or str(incoming.get(k)).strip() == ""]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required answers: {', '.join(missing)}")

    allowed_keys = set(required_qs)
    payload = {k: v for k, v in incoming.items() if k in allowed_keys}

    answer = QA2(user_id=current_user.id, **payload)
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return {"message": "Feedback submitted for questionnaire 2!", "id": answer.id}

@router.get("/questionnaire/2/me", response_model=Questionnaire2In)
def get_my_questionnaire2(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    answer = db.query(QA2).filter_by(user_id=current_user.id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="No answers for questionnaire 2")
    return answer

@router.get("/questionnaire/all/2", response_model=List[Questionnaire2Out])
def get_all_q2(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    return db.query(QA2).all()
