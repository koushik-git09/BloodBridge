import os
from pathlib import Path
from dotenv import load_dotenv

# backend/app/core/config.py
# Go up:
# core → app → backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "bloodbridge")

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

if not MONGODB_URL:
    raise ValueError(f"MONGODB_URL is not set. Checked: {ENV_FILE}")

if not SECRET_KEY:
    raise ValueError(f"SECRET_KEY is not set. Checked: {ENV_FILE}")