import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.blood_requests import router as blood_request_router
from app.database.mongodb import db
from app.routers.auth import router as auth_router
from app.routers.blood_banks import router as blood_bank_router
from app.routers import blood_bank_reservations
from app.routers.donor_matching import router as donor_matching_router
from app.routers import donor_requests
from app.routers import users
from app.routers import donations
from app.routers.admin import router as admin_router
from app.routers.notifications import router as notifications_router
from app.core.config import FRONTEND_URL, CORS_ORIGINS

logger = logging.getLogger("bloodbridge")


async def init_db_indexes():
    """Ensure essential query indexes exist in MongoDB without recreating existing ones."""
    try:
        # Users collection
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")

        # Blood Requests collection
        await db.blood_requests.create_index([("hospital_id", 1), ("created_at", -1)])
        await db.blood_requests.create_index("status")

        # Donor Requests collection
        await db.donor_requests.create_index([("donor_id", 1), ("status", 1)])
        await db.donor_requests.create_index("request_id")

        # Blood Bank Reservations collection
        await db.blood_bank_reservations.create_index([("blood_bank_id", 1), ("status", 1)])
        await db.blood_bank_reservations.create_index("request_id")

        # Notifications collection
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

        # Password Reset Tokens (TTL index on expires_at for automatic cleanup)
        await db.password_reset_tokens.create_index("token_hash", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

        logger.info("[DB] MongoDB production indexes initialized successfully.")
    except Exception as e:
        logger.warning(f"[DB] Index initialization note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_indexes()
    yield


app = FastAPI(
    title="BloodBridge API",
    version="1.0.0",
    lifespan=lifespan,
)

# Build allowed origins list for CORS
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

if CORS_ORIGINS:
    if CORS_ORIGINS == "*":
        allowed_origins = ["*"]
    else:
        for origin in CORS_ORIGINS.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if CORS_ORIGINS != "*" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(blood_request_router)
app.include_router(blood_bank_router)
app.include_router(
    blood_bank_reservations.router
)
app.include_router(donor_matching_router)
app.include_router(donor_requests.router)
app.include_router(users.router)
app.include_router(
    donations.router
)
app.include_router(
    donations.donations_router
)
app.include_router(notifications_router)


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