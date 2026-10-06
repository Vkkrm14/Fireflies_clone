from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from schemas.common import UtcDatetime


class UserBase(BaseModel):
    name: str
    email: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    created_at: UtcDatetime

    model_config = {"from_attributes": True}
