import os
from sqlalchemy import Table
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    func,
    Text
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, backref
from sqlalchemy import text
from sqlalchemy import Boolean

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@db:5432/socialNetwork"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

user_group = Table(
    "user_group",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("group_id", Integer, ForeignKey("groups.id"))
)

follows = Table(
    "user_follows",
    Base.metadata,
    Column("follower_id", Integer, ForeignKey("users.id")),
    Column("followed_id", Integer, ForeignKey("users.id"))
)

group_followers = Table(
    "group_followers",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id")),
    Column("user_id", Integer, ForeignKey("users.id"))
)

blocked_users = Table(
    "blocked_users",
    Base.metadata,
    Column("blocker_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("blocked_id", Integer, ForeignKey("users.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    firstname = Column(String, nullable=False)
    lastname = Column(String, nullable=False)
    username = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password = Column(String, nullable=False)
    xp = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
    memes_uploaded = Column(Integer, default=0)
    accepted_responsibility = Column(Boolean, default=False)
    accepted_responsibility_at = Column(DateTime, nullable=True)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="user", cascade="all, delete-orphan")
    groups = relationship("Group", secondary=user_group, back_populates="users")
    last_notif_open = Column(DateTime, default=None)

    following = relationship(
        "User",
        secondary=follows,
        primaryjoin=id == follows.c.follower_id,
        secondaryjoin=id == follows.c.followed_id,
        backref="followers"
    )

    blocked = relationship(
        "User",
        secondary=blocked_users,
        primaryjoin=id == blocked_users.c.blocker_id,
        secondaryjoin=id == blocked_users.c.blocked_id,
        backref="blocked_by",   
        lazy="selectin",
    )

class Post(Base):
    __tablename__ = "posts"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=True) 
    content    = Column(String, nullable=False)
    type       = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    language = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    estimated_time = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    prerequisites = Column(Text, nullable=True) 

    links = Column(Text, nullable=True) 
    tags = Column(Text, nullable=True)

    author       = relationship("User", back_populates="posts")
    interactions = relationship("Interaction", back_populates="post", cascade="all, delete-orphan")
    group = relationship("Group")


class Interaction(Base):
    __tablename__ = "interactions"
    id         = Column(Integer, primary_key=True, index=True)
    post_id    = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    type       = Column(String, nullable=False)
    content    = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    parent_id  = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"), nullable=True)
    quoted_text = Column(Text, nullable=True)

    post = relationship("Post", back_populates="interactions")
    user = relationship("User", back_populates="interactions")

    replies = relationship(
        "Interaction",
        backref=backref("parent", remote_side=[id]),
        cascade="all, delete",
        passive_deletes=True
    )

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
    members = Column(Integer, default=0)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", backref="owned_groups")
    followers = relationship("User", secondary="group_followers", backref="followed_groups")


    users = relationship("User", secondary=user_group, back_populates="groups")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)   
    type = Column(String, nullable=False)  
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(Integer, ForeignKey("interactions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read = Column(Integer, default=0)  

    recipient = relationship("User", foreign_keys=[recipient_id])
    actor = relationship("User", foreign_keys=[actor_id])

class QuestionnaireAnswer(Base):
    __tablename__ = "questionnaire_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    navigation = Column(String, nullable=True)  
    would_use = Column(String, nullable=True)
    easy_find = Column(String, nullable=True)
    design = Column(String, nullable=True)
    improve = Column(String, nullable=True)
    desired_functionality = Column(String, nullable=True)
    more_feedback = Column(String, nullable=True)
    
    user = relationship("User")

class QuestionnaireAnswer2(Base):
    __tablename__ = "questionnaire2_answers"  
    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    q1        = Column(String, nullable=True) 
    q2        = Column(String, nullable=True) 
    q3        = Column(String, nullable=True)
    q4        = Column(String, nullable=True)
    q5        = Column(String, nullable=True)
    q6        = Column(String, nullable=True)
    q7        = Column(String, nullable=True)
    q8        = Column(String, nullable=True)
    q9        = Column(String, nullable=True)
    user      = relationship("User")


def init_db():
    # with engine.begin() as conn:
    #     conn.execute(text("DROP TABLE IF EXISTS user_follows CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS user_group CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS interactions CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS posts CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS groups CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS notifications CASCADE;"))
    #     conn.execute(text("DROP TABLE IF EXISTS questionnaire_answers CASCADE;"))

    #Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependência para injetar sessão do SQLAlchemy nas rotas.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
