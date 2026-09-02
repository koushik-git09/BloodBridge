from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.blood_requests import router as blood_request_router
from app.database.mongodb import db
from app.routers.auth import router as auth_router
from app.routers.blood_banks import router as blood_bank_router
from app.routers import blood_bank_reservations

app = FastAPI(
    title="BloodBridge API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(blood_request_router)
app.include_router(blood_bank_router)
app.include_router(
    blood_bank_reservations.router
)
@app.get("/")
async def root():
    return {
        "message": "BloodBridge API is running"
    }


@app.get("/health")
async def health_check():

    try:

        await db.command("ping")

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:

        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }