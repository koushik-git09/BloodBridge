import os
from pathlib import Path
from dotenv import load_dotenv

# backend/app/core/config.py
# Go up:
# core → app → backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

ENV_FILE = BASE_DIR / ".env"

# Load local .env if it exists, otherwise rely on system environment variables (Docker/Render/etc.)
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "bloodbridge")

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not set. Please set it in .env or as a container/cloud environment variable.")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not set. Please set it in .env or as a container/cloud environment variable.")

# SMTP & Email Settings
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# CORS Settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").strip()

# Firebase Cloud Messaging & Admin Settings
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "credentials/firebase-service-account.json")
FIREBASE_CREDENTIALS_FULL_PATH = (
    Path(FIREBASE_CREDENTIALS_PATH)
    if os.path.isabs(FIREBASE_CREDENTIALS_PATH)
    else BASE_DIR / FIREBASE_CREDENTIALS_PATH
)

