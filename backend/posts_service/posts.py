from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import joinedload
from shared.databasesetup import get_db, User as UserModel, Post as PostModel, Interaction as InteractionModel, Group as GroupModel, Notification as NotificationModel
from users_service.users import get_current_user
import json
from collections import Counter
from fastapi import File, UploadFile
import uuid, os
from fastapi import Request
from sqlalchemy import or_, and_, not_

def blocked_id_sets(user: UserModel):
    i_block = {u.id for u in user.blocked}
    blocked_me = {u.id for u in user.blocked_by}
    return i_block, blocked_me

def guard_user_visibility(db: Session, current: UserModel, username: str):
    target = db.query(UserModel).filter_by(username=username).first()
    if not target:
        raise HTTPException(404, "User not found")

    i_block_current, _ = blocked_id_sets(current)     
    _, blocked_by_target = blocked_id_sets(target)  

    if (target.id in i_block_current) or (current.id in blocked_by_target):
        raise HTTPException(403, "You cannot view this user")
    return target



router = APIRouter(tags=["posts"])



class PostCreate(BaseModel):
    content: str
    type: str
    group_id: Optional[int] = None
    language: Optional[str] = None
    image_url: Optional[str] = None
    links: Optional[List[str]] = None

    estimated_time: Optional[str] = None
    difficulty: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    tags: Optional[List[str]] = None



class InteractionCreate(BaseModel):
    type: str              
    content: Optional[str] = None
    parent_id: Optional[int] = None  
    quoted_text: Optional[str] = None


class InteractionOut(BaseModel):
    id: int
    user: str
    image_url: Optional[str] = None
    type: str
    content: Optional[str] = None 
    parent_id: Optional[int] = None
    created_at: datetime
    username: str
    quoted_text: Optional[str] = None

    class Config:
        orm_mode = True


class PostOut(BaseModel):
    id: int
    user_id: int
    name: str
    username: str
    image_url: Optional[str] = None
    content: str
    type: str
    group_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    interactions: List[InteractionOut] = []
    group_name: Optional[str] = None
    language: Optional[str] = None
    meme_url: Optional[str] = None
    links: Optional[List[str]] = None
    estimated_time: Optional[str] = None
    difficulty: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    class Config:
        orm_mode = True

class UserLikeOut(BaseModel):
    id: int
    name: str
    username: str
    image_url: str | None = None
    is_following: bool
    blocked: bool = False  
    blocked_me: bool = False   

    class Config:
        orm_mode = True

def create_notification(
    db: Session,
    *,
    actor_id: int,
    interaction_type: str,
    post: PostModel,
    parent_id: int | None = None
):
    recipient_id = None
    comment_id = None

    if parent_id:
        parent = db.query(InteractionModel).filter_by(id=parent_id).first()
        if parent and parent.user_id != actor_id:
            recipient_id = parent.user_id
            comment_id = parent.id
    elif interaction_type == "comment":
        if post.user_id != actor_id:
            recipient_id = post.user_id
    elif interaction_type == "like":
        if post.user_id != actor_id:
            recipient_id = post.user_id

    if recipient_id:
        notif = NotificationModel(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=interaction_type,
            post_id=post.id,
            comment_id=comment_id,
        )
        db.add(notif)



@router.post("/posts", response_model=PostOut)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    spend_upload_if_needed(db, current_user, before_url=None, after_url=payload.image_url)

    new_post = PostModel(
        user_id=current_user.id,
        group_id=payload.group_id,
        content=payload.content,
        type=payload.type,
        language=payload.language,
        image_url=payload.image_url,
        links=json.dumps(payload.links) if payload.links else None,
        estimated_time=payload.estimated_time,
        difficulty=payload.difficulty,
        prerequisites=json.dumps(payload.prerequisites) if payload.prerequisites else None,
        tags=json.dumps(payload.tags) if payload.tags else None,
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return PostOut(
        id=new_post.id,
        username=current_user.username,
        name=f"{current_user.firstname} {current_user.lastname}",
        image_url=current_user.image_url,
        user_id=current_user.id,
        content=new_post.content,
        type=new_post.type,
        group_id=new_post.group_id,
        created_at=new_post.created_at,
        updated_at=new_post.updated_at,
        interactions=[],
        meme_url=new_post.image_url, 
        group_name=new_post.group.name if new_post.group else None,
        language=new_post.language,
        links=json.loads(new_post.links) if new_post.links else [],
        estimated_time=new_post.estimated_time,
        difficulty=new_post.difficulty,
        prerequisites=json.loads(new_post.prerequisites) if new_post.prerequisites else [],
        tags=json.loads(new_post.tags) if new_post.tags else []

    )


@router.get("/posts", response_model=List[PostOut])
def list_posts(
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0,
    following: bool = False,
    current_user: UserModel = Depends(get_current_user),
):
    query = db.query(PostModel).options(
        joinedload(PostModel.author),
        joinedload(PostModel.group),
    ).order_by(PostModel.created_at.desc())

    i_block, blocked_me = blocked_id_sets(current_user)
    if i_block or blocked_me:
        query = query.filter(
            not_(PostModel.user_id.in_(i_block.union(blocked_me)))
        )

    if following:
        following_user_ids = [u.id for u in current_user.following]
        following_group_ids = [g.id for g in current_user.groups]

        print("Following User IDs:", following_user_ids)
        print("Following Group IDs:", following_group_ids)

        if not following_user_ids and not following_group_ids:
            return []  

        query = query.filter(
            or_(
                PostModel.user_id.in_(following_user_ids),
                PostModel.group_id.in_(following_group_ids),
            )
        )

    posts = query.limit(limit).offset(offset).all()

    print("Number of posts fetched:", len(posts))

    output: List[PostOut] = []
    for post in posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            )
            for i in post.interactions
        ]

        output.append(
            PostOut(
                id=post.id,
                user_id=post.author.id,
                name=f"{post.author.firstname} {post.author.lastname}",
                username=post.author.username,
                image_url=post.author.image_url,
                content=post.content,
                type=post.type,
                group_id=post.group_id,
                created_at=post.created_at,
                updated_at=post.updated_at,
                interactions=inters_out,
                group_name=post.group.name if post.group else None,
                language=post.language,
                meme_url=post.image_url,
                links=json.loads(post.links) if post.links else [],
                estimated_time=post.estimated_time,
                difficulty=post.difficulty,
                prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                tags=json.loads(post.tags) if post.tags else [],
            )
        )

    return output


@router.post("/posts/{post_id}/interact", response_model=InteractionOut)
def interact_post(
    post_id: int,
    payload: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    post = db.query(PostModel).get(post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    
  
    i_block_me, _ = blocked_id_sets(current_user)    
    _, blocked_by_author = blocked_id_sets(post.author)  

    if (post.author.id in i_block_me) or (current_user.id in blocked_by_author):
        raise HTTPException(403, "You cannot interact with this user/post")


    if payload.type == "comment" and not payload.content:
        raise HTTPException(400, detail="Comment must have content")
    
    if payload.type not in {"like", "comment", "save"}:
        raise HTTPException(400, "Unknown interaction type")

    interaction = InteractionModel(
        post_id=post_id,
        user_id=current_user.id,
        type=payload.type,
        content=payload.content if payload.type == "comment" else None,
        parent_id=payload.parent_id,
        quoted_text=payload.quoted_text,
    )

    db.add(interaction)
    db.flush()

    if payload.type in {"like", "comment"}:
        interaction_type = "reply" if payload.parent_id and payload.type == "comment" else payload.type
        create_notification(
            db=db,
            actor_id=current_user.id,
            interaction_type=interaction_type,
            post=post,
            parent_id=payload.parent_id
        )

    if payload.type == "comment" and not payload.parent_id and post.author.id != current_user.id:
        post.author.xp += 50

    if payload.type == "comment" and payload.parent_id:
        parent = db.query(InteractionModel).filter_by(id=payload.parent_id).first()
        if parent and parent.user_id != current_user.id:
            author = db.query(UserModel).filter_by(id=parent.user_id).first()
            if author:
                author.xp += 50

    db.commit()
    db.refresh(interaction)

    return InteractionOut(
        id=interaction.id,
        user=f"{current_user.firstname} {current_user.lastname}",
        image_url=current_user.image_url,
        type=interaction.type,
        content=interaction.content,
        parent_id=interaction.parent_id,
        created_at=interaction.created_at,
        username=current_user.username,
        quoted_text=interaction.quoted_text,
    )


@router.delete("/interactions/{interaction_id}")
def delete_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    interaction = db.query(InteractionModel).get(interaction_id)
    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(404, "Interaction not found or unauthorized")
    
    db.query(InteractionModel).filter(InteractionModel.parent_id == interaction_id).delete(synchronize_session=False)
    db.commit()

    db.query(NotificationModel).filter(NotificationModel.comment_id == interaction_id).delete(synchronize_session=False)
    db.commit()

    db.delete(interaction)
    db.commit()
    return {"message": "Interaction removed"}


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    post = db.query(PostModel).get(post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(404, "Post not found or unauthorized")
    
    db.query(NotificationModel).filter(NotificationModel.post_id == post_id).delete(synchronize_session=False)
    db.commit()
    db.delete(post)
    db.commit()
    return {"message": "Post removed"}


@router.get("/groups/{group_id}/posts", response_model=List[PostOut])
def get_group_posts(
    group_id: int,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    group = db.query(GroupModel).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")

    i_block, blocked_me = blocked_id_sets(current_user)
    blocked_ids = i_block.union(blocked_me)

    posts = (
        db.query(PostModel)
        .options(joinedload(PostModel.author), joinedload(PostModel.group))
        .filter(
            PostModel.group_id == group_id,
            ~PostModel.user_id.in_(blocked_ids)
        )
        .order_by(PostModel.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    output = []
    for post in posts:
        inters_out = []
        for i in post.interactions:
            if i.user_id in blocked_ids:
                continue
            inters_out.append(
                InteractionOut(
                    id=i.id,
                    user=f"{i.user.firstname} {i.user.lastname}",
                    username=i.user.username,
                    image_url=i.user.image_url,
                    type=i.type,
                    content=i.content,
                    parent_id=i.parent_id,
                    created_at=i.created_at,
                    quoted_text=i.quoted_text,
                )
            )

        output.append(
            PostOut(
                id=post.id,
                user_id=post.author.id,
                name=f"{post.author.firstname} {post.author.lastname}",
                username=post.author.username,
                image_url=post.author.image_url,
                content=post.content,
                type=post.type,
                group_id=post.group_id,
                created_at=post.created_at,
                updated_at=post.updated_at,
                interactions=inters_out,
                group_name=post.group.name if post.group else None,
                language=post.language,
                meme_url=post.image_url,
                links=json.loads(post.links) if post.links else [],
                estimated_time=post.estimated_time,
                difficulty=post.difficulty,
                prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                tags=json.loads(post.tags) if post.tags else [],
            )
        )

    return output


@router.put("/posts/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    post = db.query(PostModel).filter_by(id=post_id).first()
    if not post or post.user_id != current_user.id:
        raise HTTPException(404, "Post not found or unauthorized")

    old_url = post.image_url

    post.content = payload.content
    post.language = payload.language
    post.image_url = payload.image_url
    post.estimated_time = payload.estimated_time
    post.difficulty = payload.difficulty
    post.prerequisites = json.dumps(payload.prerequisites) if payload.prerequisites else None
    post.links = json.dumps(payload.links) if payload.links else None
    post.updated_at = datetime.utcnow()
    post.tags = json.dumps(payload.tags) if payload.tags else None

    spend_upload_if_needed(db, current_user, before_url=old_url, after_url=payload.image_url)


    db.commit()
    db.refresh(post)

    return PostOut(
        id=post.id,
        username=current_user.username,
        name=f"{current_user.firstname} {current_user.lastname}",
        user_id=post.user_id,
        content=post.content,
        type=post.type,
        group_id=post.group_id,
        created_at=post.created_at,
        updated_at=post.updated_at,
        interactions=[],
        group_name=post.group.name if post.group else None,
        language=post.language,
        meme_url=post.image_url,
        links=json.loads(post.links) if post.links else [],
        estimated_time=post.estimated_time,
        difficulty=post.difficulty,
        prerequisites=json.loads(post.prerequisites) if post.prerequisites else []
    )


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    post = db.query(PostModel).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    i_block_me, _ = blocked_id_sets(current_user)
    _, blocked_by_author = blocked_id_sets(post.author)

    if (post.author.id in i_block_me) or (current_user.id in blocked_by_author):
        raise HTTPException(403, "You cannot view this post")


    author = post.author
    inters_out = [
        InteractionOut(
            id=i.id,
            user=f"{i.user.firstname} {i.user.lastname}",
            username=i.user.username,
            image_url=i.user.image_url,
            type=i.type,
            content=i.content,
            parent_id=i.parent_id,
            created_at=i.created_at,
            quoted_text=i.quoted_text,
        )
        for i in post.interactions
    ]

    return PostOut(
        id=post.id,
        user_id=author.id,
        name=f"{author.firstname} {author.lastname}",
        username=author.username,
        image_url=author.image_url, 
        content=post.content,
        type=post.type,
        meme_url=post.image_url,
        group_id=post.group_id,
        created_at=post.created_at,
        updated_at=post.updated_at,
        interactions=inters_out,
        group_name=post.group.name if post.group else None,
        language=post.language,
        links=json.loads(post.links) if post.links else [],
        estimated_time=post.estimated_time,
        difficulty=post.difficulty,
        prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
        tags=json.loads(post.tags) if post.tags else [],
    )

@router.get("/top-tags")
def get_top_tags(limit: int = 5, db: Session = Depends(get_db)):
    tags_counter = Counter()

    posts = db.query(PostModel).filter(PostModel.tags != None).all()
    for post in posts:
        try:
            tags = json.loads(post.tags or "[]")
            tags_counter.update(tags)
        except:
            continue

    top = tags_counter.most_common(limit)
    return [{"tag": tag, "posts": count} for tag, count in top]

@router.get("/tags/{tag}/posts", response_model=List[PostOut])
def get_posts_by_tag(
    tag: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    posts = (
        db.query(PostModel)
        .options(joinedload(PostModel.author), joinedload(PostModel.group))
        .filter(PostModel.tags != None)
        .order_by(PostModel.created_at.desc())
        .all()
    )

    result = []
    for post in posts:
        try:
            tags = json.loads(post.tags or "[]")
            if tag in tags:
                inters_out = [
                    InteractionOut(
                        id=i.id,
                        user=f"{i.user.firstname} {i.user.lastname}",
                        username=i.user.username,
                        image_url=i.user.image_url,
                        type=i.type,
                        content=i.content,
                        parent_id=i.parent_id,
                        created_at=i.created_at,
                    )
                    for i in post.interactions
                ]

                result.append(
                    PostOut(
                        id=post.id,
                        user_id=post.author.id,
                        name=f"{post.author.firstname} {post.author.lastname}",
                        username=post.author.username,
                        image_url=post.author.image_url,
                        content=post.content,
                        type=post.type,
                        group_id=post.group_id,
                        created_at=post.created_at,
                        updated_at=post.updated_at,
                        interactions=inters_out,
                        group_name=post.group.name if post.group else None,
                        language=post.language,
                        meme_url=post.image_url,
                        links=json.loads(post.links) if post.links else [],
                        estimated_time=post.estimated_time,
                        difficulty=post.difficulty,
                        prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                        tags=tags,
                    )
                )
        except:
            continue

    return result

def meme_uploads_allowed(user: UserModel):
    return (user.xp // 100) // 10

def is_local_upload(url: Optional[str]) -> bool:
    return bool(url) and str(url).startswith("/uploads/")

def spend_upload_if_needed(db: Session, user: UserModel, before_url: Optional[str], after_url: Optional[str]):

    if not is_local_upload(after_url):
        return

    if before_url and before_url == after_url:
        return

    user_db = (
        db.query(UserModel)
          .filter(UserModel.id == user.id)
          .with_for_update()
          .first()
    )
    if not user_db:
        raise HTTPException(404, "User not found")

    allowed = meme_uploads_allowed(user_db)
    used = user_db.memes_uploaded or 0
    if used >= allowed:
        raise HTTPException(
            403,
            f"Chegou ao limite de uploads ({allowed}) para o seu nível ({user_db.xp // 100}). "
            "Ganhe mais níveis para mais uploads."
        )

    user_db.memes_uploaded = used + 1
    db.commit()


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    """
    Faz somente o upload do ficheiro e devolve a URL.
    NÃO consome 'memes_uploaded' aqui. O consumo acontece em create/update post.
    """
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"url": f"/uploads/{filename}"}


@router.get("/me/likes", response_model=List[PostOut])
def get_my_liked_posts(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    liked_posts = (
        db.query(PostModel)
          .join(InteractionModel, InteractionModel.post_id == PostModel.id)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(
              InteractionModel.user_id == current.id,
              InteractionModel.type == "like",
              InteractionModel.parent_id == None
          )
          .order_by(InteractionModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result = []
    for post in liked_posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            ) for i in post.interactions
        ]

        result.append(PostOut(
            id=post.id,
            user_id=post.author.id,
            name=f"{post.author.firstname} {post.author.lastname}",
            username=post.author.username,
            image_url=post.author.image_url,
            content=post.content,
            type=post.type,
            group_id=post.group_id,
            created_at=post.created_at,
            updated_at=post.updated_at,
            interactions=inters_out,
            group_name=post.group.name if post.group else None,
            language=post.language,
            meme_url=post.image_url,
            links=json.loads(post.links) if post.links else [],
            estimated_time=post.estimated_time,
            difficulty=post.difficulty,
            prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
            tags=json.loads(post.tags) if post.tags else [],
        ))

    return result

@router.get("/me/replies", response_model=List[PostOut])
def get_my_replied_posts(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    post_ids_subq = (
        db.query(InteractionModel.post_id)
          .filter(
              InteractionModel.user_id == current.id,
              InteractionModel.type == "comment"
          )
          .distinct()
          .subquery()
    )

    posts = (
        db.query(PostModel)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(PostModel.id.in_(post_ids_subq))
          .order_by(PostModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result = []
    for post in posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            ) for i in post.interactions
        ]

        result.append(PostOut(
            id=post.id,
            user_id=post.author.id,
            name=f"{post.author.firstname} {post.author.lastname}",
            username=post.author.username,
            image_url=post.author.image_url,
            content=post.content,
            type=post.type,
            group_id=post.group_id,
            created_at=post.created_at,
            updated_at=post.updated_at,
            interactions=inters_out,
            group_name=post.group.name if post.group else None,
            language=post.language,
            meme_url=post.image_url,
            links=json.loads(post.links) if post.links else [],
            estimated_time=post.estimated_time,
            difficulty=post.difficulty,
            prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
            tags=json.loads(post.tags) if post.tags else [],
        ))

    return result

@router.get("/users/{username}/likes", response_model=List[PostOut])
def get_user_liked_posts(
    username: str,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    target = db.query(UserModel).filter_by(username=username).first()
    if not target:
        raise HTTPException(404, "User not found")

    guard_user_visibility(db, current, username)


    liked = (
        db.query(PostModel)
          .join(InteractionModel, InteractionModel.post_id == PostModel.id)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(
            InteractionModel.user_id == target.id,
            InteractionModel.type == "like",
            InteractionModel.parent_id == None
          )
          .order_by(InteractionModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result: List[PostOut] = []
    for post in liked:
        inters_out = []
        for i in post.interactions:
            inters_out.append(
                InteractionOut(
                    id=i.id,
                    user=f"{i.user.firstname} {i.user.lastname}",
                    username=i.user.username,
                    image_url=i.user.image_url,
                    type=i.type,
                    content=i.content,
                    parent_id=i.parent_id,
                    created_at=i.created_at,
                    quoted_text=i.quoted_text,
                )
            )

        result.append(
            PostOut(
                id=post.id,
                user_id=post.author.id,
                name=f"{post.author.firstname} {post.author.lastname}",
                username=post.author.username,
                image_url=post.author.image_url,
                content=post.content,
                type=post.type,
                group_id=post.group_id,
                created_at=post.created_at,
                updated_at=post.updated_at,
                interactions=inters_out,
                group_name=post.group.name if post.group else None,
                language=post.language,
                meme_url=post.image_url,
                links=json.loads(post.links) if post.links else [],
                estimated_time=post.estimated_time,
                difficulty=post.difficulty,
                prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                tags=json.loads(post.tags) if post.tags else [],
            )
        )
    return result


@router.get("/users/{username}/replies", response_model=List[PostOut])
def get_user_replied_posts(
    username: str,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    target = db.query(UserModel).filter_by(username=username).first()
    if not target:
        raise HTTPException(404, "User not found")

    guard_user_visibility(db, current, username)


    post_ids = (
        db.query(InteractionModel.post_id)
          .filter(
            InteractionModel.user_id == target.id,
            InteractionModel.type == "comment"
          )
          .distinct()
          .subquery()
    )

    posts = (
        db.query(PostModel)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(PostModel.id.in_(post_ids))
          .order_by(PostModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result: List[PostOut] = []
    for post in posts:
        inters_out = []
        for i in post.interactions:
            inters_out.append(
                InteractionOut(
                    id=i.id,
                    user=f"{i.user.firstname} {i.user.lastname}",
                    username=i.user.username,
                    image_url=i.user.image_url,
                    type=i.type,
                    content=i.content,
                    parent_id=i.parent_id,
                    created_at=i.created_at,
                    quoted_text=i.quoted_text,
                )
            )

        result.append(
            PostOut(
                id=post.id,
                user_id=post.author.id,
                name=f"{post.author.firstname} {post.author.lastname}",
                username=post.author.username,
                image_url=post.author.image_url,
                content=post.content,
                type=post.type,
                group_id=post.group_id,
                created_at=post.created_at,
                updated_at=post.updated_at,
                interactions=inters_out,
                group_name=post.group.name if post.group else None,
                language=post.language,
                meme_url=post.image_url,
                links=json.loads(post.links) if post.links else [],
                estimated_time=post.estimated_time,
                difficulty=post.difficulty,
                prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                tags=json.loads(post.tags) if post.tags else [],
            )
        )
    return result 

@router.get("/me/posts", response_model=List[PostOut])
def get_my_posts(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    posts = (
        db.query(PostModel)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(PostModel.user_id == current.id)
          .order_by(PostModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result = []
    for post in posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            ) for i in post.interactions
        ]

        result.append(PostOut(
            id=post.id,
            user_id=post.author.id,
            name=f"{post.author.firstname} {post.author.lastname}",
            username=post.author.username,
            image_url=post.author.image_url,
            content=post.content,
            type=post.type,
            group_id=post.group_id,
            created_at=post.created_at,
            updated_at=post.updated_at,
            interactions=inters_out,
            group_name=post.group.name if post.group else None,
            language=post.language,
            meme_url=post.image_url,
            links=json.loads(post.links) if post.links else [],
            estimated_time=post.estimated_time,
            difficulty=post.difficulty,
            prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
            tags=json.loads(post.tags) if post.tags else [],
        ))

    return result

@router.get("/users/{username}/posts", response_model=List[PostOut])
def get_user_posts(
    username: str,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    target = guard_user_visibility(db, current_user, username)

    posts = (
        db.query(PostModel)
        .options(joinedload(PostModel.author), joinedload(PostModel.group))
        .filter(PostModel.user_id == target.id)
        .order_by(PostModel.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result: List[PostOut] = []
    for post in posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            )
            for i in post.interactions
        ]

        result.append(
            PostOut(
                id=post.id,
                user_id=post.author.id,
                name=f"{post.author.firstname} {post.author.lastname}",
                username=post.author.username,
                image_url=post.author.image_url,
                content=post.content,
                type=post.type,
                group_id=post.group_id,
                created_at=post.created_at,
                updated_at=post.updated_at,
                interactions=inters_out,
                group_name=post.group.name if post.group else None,
                language=post.language,
                meme_url=post.image_url,
                links=json.loads(post.links) if post.links else [],
                estimated_time=post.estimated_time,
                difficulty=post.difficulty,
                prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
                tags=json.loads(post.tags) if post.tags else [],
            )
        )

    return result


@router.get("/me/saved", response_model=List[PostOut])
def get_my_saved_posts(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    saved_posts = (
        db.query(PostModel)
          .join(InteractionModel, InteractionModel.post_id == PostModel.id)
          .options(joinedload(PostModel.author), joinedload(PostModel.group))
          .filter(
              InteractionModel.user_id == current.id,
              InteractionModel.type == "save",
              InteractionModel.parent_id == None
          )
          .order_by(InteractionModel.created_at.desc())
          .offset(offset)
          .limit(limit)
          .all()
    )

    result = []
    for post in saved_posts:
        inters_out = [
            InteractionOut(
                id=i.id,
                user=f"{i.user.firstname} {i.user.lastname}",
                username=i.user.username,
                image_url=i.user.image_url,
                type=i.type,
                content=i.content,
                parent_id=i.parent_id,
                created_at=i.created_at,
                quoted_text=i.quoted_text,
            ) for i in post.interactions
        ]

        result.append(PostOut(
            id=post.id,
            user_id=post.author.id,
            name=f"{post.author.firstname} {post.author.lastname}",
            username=post.author.username,
            image_url=post.author.image_url,
            content=post.content,
            type=post.type,
            group_id=post.group_id,
            created_at=post.created_at,
            updated_at=post.updated_at,
            interactions=inters_out,
            group_name=post.group.name if post.group else None,
            language=post.language,
            meme_url=post.image_url,
            links=json.loads(post.links) if post.links else [],
            estimated_time=post.estimated_time,
            difficulty=post.difficulty,
            prerequisites=json.loads(post.prerequisites) if post.prerequisites else [],
            tags=json.loads(post.tags) if post.tags else [],
        ))

    return result

def is_following(current, user):
    return user in current.following

@router.get("/{post_id}/likes", response_model=List[UserLikeOut])
def get_post_likers(post_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    post = db.query(PostModel).filter_by(id=post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")

    likes = (
        db.query(InteractionModel)
        .filter_by(post_id=post_id, type="like", parent_id=None)
        .options(joinedload(InteractionModel.user))
        .all()
    )

    following_ids = {u.id for u in current_user.following}
    i_block, blocked_me = blocked_id_sets(current_user) 

    results = []
    for like in likes:
        liker = like.user
        results.append({
            "id": liker.id,
            "name": f"{liker.firstname} {liker.lastname}",
            "username": liker.username,
            "image_url": liker.image_url,
            "is_following": liker.id in following_ids,
            "blocked": liker.id in i_block,          
            "blocked_me": liker.id in blocked_me,   
        })
    return results


@router.get("/comments/{comment_id}/likes", response_model=List[UserLikeOut])
def get_comment_likers(comment_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    likes = (
        db.query(InteractionModel)
        .filter_by(parent_id=comment_id, type="like")
        .options(joinedload(InteractionModel.user))
        .all()
    )

    following_ids = {u.id for u in current_user.following}
    i_block, blocked_me = blocked_id_sets(current_user)

    results = []
    for like in likes:
        liker = like.user
        results.append({
            "id": liker.id,
            "name": f"{liker.firstname} {liker.lastname}",
            "username": liker.username,
            "image_url": liker.image_url,
            "is_following": liker.id in following_ids,
            "blocked": liker.id in i_block,
            "blocked_me": liker.id in blocked_me,
        })
    return results
