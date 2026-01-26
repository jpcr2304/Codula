from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from other_service.notifications import router as notifications_router
from other_service.questionnaire import router as questionnaire_router
from shared.databasesetup import init_db

init_db()

app = FastAPI(title="Others Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notifications_router)
app.include_router(questionnaire_router)

@app.get("/")
def root():
    return {"service": "others", "status": "ok"}
