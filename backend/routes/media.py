"""Serves the placeholder audio with HTTP Range support so the player can seek."""
import os
import re

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

router = APIRouter(tags=["media"])

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media")
CONTENT_TYPES = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".mp4": "video/mp4"}
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


@router.get("/media/{name}")
def get_media(name: str, request: Request):
    path = os.path.realpath(os.path.join(MEDIA_DIR, name))
    if os.path.dirname(path) != os.path.realpath(MEDIA_DIR) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Media not found")

    size = os.path.getsize(path)
    ctype = CONTENT_TYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream")
    headers = {"Accept-Ranges": "bytes"}

    match = RANGE_RE.fullmatch(request.headers.get("range", "").strip())
    start, end = 0, size - 1
    status = 200
    if match and (match.group(1) or match.group(2)):
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else size - 1
        else:  # suffix range: last N bytes
            start = max(size - int(match.group(2)), 0)
        end = min(end, size - 1)
        if start > end or start >= size:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
        status = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"

    with open(path, "rb") as f:
        f.seek(start)
        body = f.read(end - start + 1)
    return Response(content=body, status_code=status, media_type=ctype, headers=headers)
