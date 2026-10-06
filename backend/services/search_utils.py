"""Helpers shared by every search endpoint."""
from fastapi import HTTPException

LIKE_ESCAPE = "\\"


def clean_query(q: str) -> str:
    """Trim a user query; blank queries are a client error, not a match-everything search."""
    q = (q or "").strip()
    if not q:
        raise HTTPException(status_code=422, detail="Search query must not be blank")
    return q


def contains(column, q: str):
    """Case-insensitive substring match where `%`, `_` and `\\` in the query are literal characters."""
    escaped = q.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2).replace("%", LIKE_ESCAPE + "%").replace("_", LIKE_ESCAPE + "_")
    return column.ilike(f"%{escaped}%", escape=LIKE_ESCAPE)
