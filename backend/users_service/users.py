from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Query
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl, validator, constr, AnyUrl
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
from fastapi import Body, status
from datetime import datetime, timezone
import re


from shared.databasesetup import SessionLocal, User as UserModel, Group as GroupModel, Notification as NotificationModel

class UserRegister(BaseModel):
    firstname: str
    lastname:  str
    username:  str
    email:     str
    password:  str
    image_url: Optional[AnyUrl] = Field(
        None,
        max_length=20_000,
        description="Optional profile image URL"
    )

    @validator("username")
    def username_instagram_rules(cls, v):
        if not re.match(r"^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,20}$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and periods. "
                "It cannot start/end with a period, have consecutive periods, and must be max 20 characters."
            )
        if v.startswith(".") or v.endswith("."):
            raise ValueError("Username cannot start or end with a period.")
        return v

    @validator("image_url", pre=True, always=True)
    def blank_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

class UserLogin(BaseModel):
    email:    str
    password: str

class UserProfile(BaseModel):
    id: int
    name: str
    username: str
    xp: int
    image_url: Optional[str]
    banner_url: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    last_notif_open: Optional[datetime] = None
    memes_uploaded: int = 0
    memes_allowed: int = 0
    accepted_responsibility: bool = False
    accepted_responsibility_at: Optional[datetime] = None

class UserSearchResult(BaseModel):
    id: int
    name: str
    username: str
    image_url: Optional[str] = None

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    banner_url: Optional[str] = None


class UserPublic(BaseModel):
    id: int
    name: str
    username: str
    following: bool = False

    class Config:
        orm_mode = True

class UserListOut(BaseModel):
    id: int
    name: str
    username: str
    image_url: Optional[str] = None
    blocked: bool = False     
    blocked_me: bool = False   

    class Config:
        orm_mode = True

class UserWithStats(BaseModel):
    id: int
    name: str
    username: str
    image_url: Optional[str]
    banner_url: Optional[str] = None
    xp: int
    followers_count: int
    following_count: int
    following: bool  
    is_self: bool
    blocked: bool = False
    blocked_me: bool = False

    class Config:
        orm_mode = True

SECRET_KEY = "tempkey"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(UserModel).filter_by(email=email).first()
    if not user or not verify_password(password, user.password):
        return None
    return jwt.encode({"sub": user.email}, SECRET_KEY, algorithm="HS256")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(403, "Invalid token")
    user = db.query(UserModel).filter_by(email=email).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user
    
router = APIRouter(tags=["users"])

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    first = user.firstname.strip()
    last  = re.sub(r"\s+", " ", user.lastname.strip())

    if len(first) > 10:
        raise HTTPException(400, detail="First name cannot exceed 10 characters.")
    if len(last) > 20:
        raise HTTPException(400, detail="Last name cannot exceed 20 characters.")

    if not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", first):
        raise HTTPException(400, detail="First name can only contain letters (no spaces or symbols).")

    if not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*", last):
        raise HTTPException(400, detail="Last name can only contain letters and spaces (no symbols).")

    if db.query(UserModel).filter_by(email=user.email).first():
        raise HTTPException(400, detail="Email already in use")
    if db.query(UserModel).filter_by(username=user.username).first():
        raise HTTPException(400, detail="Username already taken")

    new_user = UserModel(
        firstname=first,
        lastname=last,
        username=user.username,
        email=user.email,
        password=hash_password(user.password),
        image_url=str(user.image_url) if user.image_url else None,
        last_notif_open=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered"}


@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    token = authenticate_user(db, credentials.email, credentials.password)
    if not token:
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": token}

def meme_uploads_allowed(user):
    return (user.xp // 100) // 10

@router.get("/profile", response_model=UserProfile)
def profile(current=Depends(get_current_user)):
    print(f"[PROFILE] last_notif_open for user {current.username}: {current.last_notif_open!r}")
    lno = current.last_notif_open
    if lno:
        last_open_iso = lno.replace(tzinfo=timezone.utc).isoformat()
    else:
        last_open_iso = None
    return {
        "id": current.id,
        "name": f"{current.firstname} {current.lastname}",
        "username": current.username,
        "xp": current.xp,
        "image_url": current.image_url,
        "banner_url": current.banner_url,
        "followers_count": len(current.followers),
        "following_count": len(current.following),
        "last_notif_open": last_open_iso,
        "memes_uploaded": current.memes_uploaded or 0,
        "memes_allowed": meme_uploads_allowed(current),
        "accepted_responsibility": bool(getattr(current, "accepted_responsibility", False)),
        "accepted_responsibility_at": getattr(current, "accepted_responsibility_at", None),
    }


@router.get("/search")
def search(
    query: str = Query(..., min_length=1),
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(UserModel).filter(
        (UserModel.firstname + " " + UserModel.lastname).ilike(f"%{query}%") |
        UserModel.username.ilike(f"%{query}%")
    ).all()

    groups = db.query(GroupModel).filter(
        GroupModel.name.ilike(f"%{query}%")
    ).all()

    results = []

    for user in users:
        results.append({
            "type": "user",
            "id": user.id,
            "name": f"{user.firstname} {user.lastname}",
            "username": user.username,
            "image_url": user.image_url,
        })

    for group in groups:
        results.append({
            "type": "group",
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "username": None,  
            "image_url": group.image,
        })

    return results



@router.get("/users/{username}", response_model=UserWithStats)
def get_user_profile(username: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter_by(username=username).first()
    if not user:
        raise HTTPException(404, "User not found")

    current_blocks_ids = {u.id for u in current.blocked}
    user_blocks_ids = {u.id for u in user.blocked}

    return {
        "id": user.id,
        "name": f"{user.firstname} {user.lastname}",
        "username": user.username,
        "image_url": user.image_url,
        "banner_url": user.banner_url,
        "xp": user.xp,
        "followers_count": len(user.followers),
        "following_count": len(user.following),
        "following": any(f.id == current.id for f in user.followers),
        "is_self": user.id == current.id,
        "blocked": user.id in current_blocks_ids,    
        "blocked_me": current.id in user_blocks_ids, 
    }



@router.get("/groups")
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(GroupModel).all()
    return [
        {
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "image": g.image,
            "banner_url": g.banner_url,
            "members": g.members,
            "owner_id": g.owner_id,  
        }
        for g in groups
    ]


@router.post("/groups")
def create_group(
    group: GroupCreate,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(GroupModel).filter_by(name=group.name).first()
    if existing:
        raise HTTPException(400, detail="Group already exists")
    
    new_group = GroupModel(
        name=group.name,
        description=group.description,
        image=group.image,
        owner_id=current.id 
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    current.groups.append(new_group)
    new_group.members += 1
    db.commit()
    return new_group


@router.post("/groups/{group_id}/join")
def join_group(group_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")

    if group in current.groups:
        raise HTTPException(400, "Already joined this group")

    current.groups.append(group)
    group.members += 1 
    db.commit()
    return {"message": "Joined group successfully"}

@router.post("/groups/{group_id}/leave")
def leave_group(
    group_id: int,
    current=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    if group not in current.groups:
        raise HTTPException(400, "You’re not a member of this group")
    current.groups.remove(group)
    group.members = max(0, (group.members or 1) - 1)
    db.commit()
    return {"message": "Left group successfully"}

@router.get("/top-groups")
def top_groups(db: Session = Depends(get_db), limit: int = 50):
    groups = (
        db.query(GroupModel)
        .order_by(GroupModel.members.desc()) 
        .limit(limit)
        .all()
    )
    return [
        {
            "id": g.id,
            "name": g.name,
            "image_url": g.image, 
            "members_count": g.members,
            "description": g.description,
        }
        for g in groups
    ]



@router.get("/my-groups")
def my_groups(current=Depends(get_current_user), db: Session = Depends(get_db)):
    return [
        {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "image": group.image
        }
        for group in current.groups
    ]

@router.post("/follow/{user_id}")
def follow_user(user_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target or target.id == current.id:
        raise HTTPException(404, "User not found or cannot follow yourself")

    if target in current.following:
        raise HTTPException(400, "Already following")

    current.following.append(target)
    notif = NotificationModel(
        recipient_id=target.id,
        actor_id=current.id,
        type="follow"
    )
    db.add(notif)

    db.commit()
    return {"message": "Now following"}

@router.get("/my-following")
def my_following(current=Depends(get_current_user)):
    return [
        {
           "id": u.id,
           "name": f"{u.firstname} {u.lastname}",
           "username": u.username,
           "image_url": u.image_url,
        }
        for u in current.following
    ]

@router.get("/people")
def all_users(current=Depends(get_current_user), db: Session = Depends(get_db)):
    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,  
        }
        for u in db.query(UserModel).filter(UserModel.id != current.id).all()
    ]

@router.get("/my-followers", response_model=List[UserListOut])
def my_followers(current=Depends(get_current_user)):
    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,
        }
        for u in current.followers
    ]

@router.get("/users/{username}/following", response_model=List[UserListOut])
def get_user_following(username: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(UserModel).filter_by(username=username).first()
    if not user:
        raise HTTPException(404, "User not found")

    i_block, blocked_me = get_block_sets(current)

    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,
            "blocked": u.id in i_block,         
            "blocked_me": u.id in blocked_me,   
        }
        for u in user.following
    ]


@router.get("/users/{username}/followers", response_model=List[UserListOut])
def get_user_followers(username: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(UserModel).filter_by(username=username).first()
    if not user:
        raise HTTPException(404, "User not found")

    i_block, blocked_me = get_block_sets(current) 

    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,
            "blocked": u.id in i_block,      
            "blocked_me": u.id in blocked_me,  
        }
        for u in user.followers
    ]


@router.post("/unfollow/{user_id}")
def unfollow_user(
    user_id: int,
    current=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(UserModel).get(user_id)
    if not target:
        raise HTTPException(404, "User not found")
    if target not in current.following:
        raise HTTPException(400, "Not following")
    current.following.remove(target)
    db.commit()
    return {"message": "Unfollowed successfully"}

@router.get("/top-followed", response_model=List[UserWithStats])
def top_followed_users(db: Session = Depends(get_db), current=Depends(get_current_user)):
    current_blocks_ids = {u.id for u in current.blocked}
    blocked_me_ids = {u.id for u in current.blocked_by}

    all_users = (
        db.query(UserModel)
        .filter(
            UserModel.id != current.id,
            ~UserModel.id.in_(current_blocks_ids),
            ~UserModel.id.in_(blocked_me_ids)
        )
        .all()
    )

    sorted_users = sorted(
        all_users,
        key=lambda u: len(u.followers),
        reverse=True
    )

    top50 = sorted_users[:50]
    return [
        {
            "id": user.id,
            "name": f"{user.firstname} {user.lastname}",
            "username": user.username,
            "image_url": user.image_url,
            "xp": user.xp,
            "followers_count": len(user.followers),
            "following_count": len(user.following),
            "following": current in user.followers,
            "is_self": False,
            "blocked": user.id in current_blocks_ids,
            "blocked_me": current.id in {u.id for u in user.blocked}
        }
        for user in top50
    ]


def is_valid_instagram_username(username: str) -> bool:
    return bool(re.match(r"^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,20}$", username)) and not username.startswith(".") and not username.endswith(".")

@router.put("/profile")
def update_profile(
    data: dict = Body(...),
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "username" in data and data["username"] != current.username:
        if not is_valid_instagram_username(data["username"]):
            raise HTTPException(status_code=400, detail="Invalid username format.")
        existing = db.query(UserModel).filter_by(username=data["username"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="This username is already taken.")

    if "firstname" in data:
        first = data["firstname"].strip()
        if len(first) > 10:
            raise HTTPException(400, detail="First name cannot exceed 10 characters.")
        if not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", first):
            raise HTTPException(400, detail="First name can only contain letters (no spaces or symbols).")
        data["firstname"] = first 

    if "lastname" in data:
        last = re.sub(r"\s+", " ", data["lastname"].strip())
        if len(last) > 20:
            raise HTTPException(400, detail="Last name cannot exceed 20 characters.")
        if not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*", last):
            raise HTTPException(400, detail="Last name can only contain letters and spaces (no symbols).")
        data["lastname"] = last 

    if "password" in data:
        current_pw = data.get("current_password")
        if not current_pw or not verify_password(current_pw, current.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        if len(data["password"]) < 6 or not any(c in "!@#$%^&*()_-+={}[]|\\:;\"'<>,.?/~`" for c in data["password"]):
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters and include a special character.")
        current.password = hash_password(data["password"])

    for field in ["firstname", "lastname", "username", "image_url", "banner_url"]:
        if field in data:
            setattr(current, field, data[field])

    db.commit()
    db.refresh(current)
    return {"message": "Profile updated"}



@router.put("/groups/{group_id}")
def update_group(
    group_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")

    if group.owner_id != current.id:
        raise HTTPException(403, "Apenas o dono pode editar o grupo")

    if "name" in data and data["name"] != group.name:
        exists = db.query(GroupModel).filter_by(name=data["name"]).first()
        if exists:
            raise HTTPException(400, "This group name is already taken.")

    for field in ["name", "description", "image", "banner_url"]:
        if field in data:
            setattr(group, field, data[field])

    db.commit()
    db.refresh(group)
    return {"message": "Group updated successfully", "group": group}

@router.get("/groups/{group_id}/members", response_model=List[UserListOut])
def get_group_members(group_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,
        }
        for u in group.users  
    ]

@router.get("/groups/{group_id}", response_model=dict)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "image": group.image,
        "banner_url": group.banner_url,
        "members": group.members,
        "owner_id": group.owner_id,
    }

def get_block_sets(user):
    i_block = {u.id for u in user.blocked}
    blocked_me = {u.id for u in user.blocked_by}
    return i_block, blocked_me

@router.post("/block/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def block_user(
    user_id: int,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = db.query(UserModel).get(user_id)
    if not target or target.id == current.id:
        raise HTTPException(404, "User not found or cannot block yourself")
    if target not in current.blocked:
        if target in current.following:
            current.following.remove(target)
        if current in target.following:
            target.following.remove(current)
        current.blocked.append(target)
        db.commit()
    return

@router.post("/unblock/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: int,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = db.query(UserModel).get(user_id)
    if not target:
        raise HTTPException(404, "User not found")
    if target in current.blocked:
        current.blocked.remove(target)
        db.commit()
    return

@router.get("/my-blocked")
def my_blocked(current=Depends(get_current_user)):
    return [
        {
            "id": u.id,
            "name": f"{u.firstname} {u.lastname}",
            "username": u.username,
            "image_url": u.image_url,
        }
        for u in current.blocked
    ]

@router.post("/accept-responsibility")
def accept_responsibility(current=Depends(get_current_user), db: Session = Depends(get_db)):
    if not getattr(current, "accepted_responsibility", False):
        current.accepted_responsibility = True
        current.accepted_responsibility_at = datetime.utcnow()
        db.commit()
    return {"ok": True, "accepted_responsibility": True, "accepted_responsibility_at": current.accepted_responsibility_at}
