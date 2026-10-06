from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from models.user import User
from schemas.user import UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    """Return the default logged-in user (id=1)."""
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        # Create default user if not seeded yet
        user = User(name="Alex Johnson", email="alex.johnson@fireflies.ai")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
