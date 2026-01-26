from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from users_service.users import router as users_router
from shared.databasesetup import init_db

init_db()

app = FastAPI(title="Users Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)

@app.get("/")
def root():
    return {"service": "users", "status": "ok"}
