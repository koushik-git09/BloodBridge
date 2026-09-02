from pydantic import BaseModel


class Location(BaseModel):
    latitude: float
    longitude: float
    address: str | None = None