from fastapi import FastAPI
from app.database.mongodb import db

app = FastAPI(
    title="BloodBridge API",
    description="Hospital-verified blood request and intelligent donor matching system",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "BloodBridge API is running successfully"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/database-test")
def database_test():
    try:
        db.command("ping")

        return {
            "status": "MongoDB connected successfully",
            "database": db.name
        }

    except Exception as e:
        return {
            "status": "MongoDB connection failed",
            "error": str(e)
        }