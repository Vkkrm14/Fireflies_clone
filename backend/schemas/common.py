"""Shared datetime handling: the database holds naive UTC; the API speaks explicit-UTC ISO strings."""
from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import BeforeValidator, PlainSerializer


def to_naive_utc(value):
    """Aware datetimes are converted to UTC; naive ones are already UTC by convention."""
    try:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
    except OverflowError:
        raise ValueError("date is out of range")
    return value


def to_iso_z(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.isoformat() + "Z"


UtcDatetime = Annotated[datetime, BeforeValidator(to_naive_utc), PlainSerializer(to_iso_z, return_type=str)]
