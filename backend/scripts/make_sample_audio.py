"""Generate media/sample-meeting.wav, a quiet 6-minute placeholder track for the player.

Run from backend/:  python scripts/make_sample_audio.py
Low sample rate keeps the file around 1.4 MB. Real recordings are out of scope.
"""
import math
import os
import struct
import wave

RATE = 8000
SECONDS = 6 * 60
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media", "sample-meeting.wav")

with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(1)
    w.setframerate(RATE)
    frames = bytearray()
    for n in range(RATE * SECONDS):
        t = n / RATE
        swell = 0.5 + 0.5 * math.sin(2 * math.pi * t / 6)      # slow 6s breathing
        tone = math.sin(2 * math.pi * 196 * t) + 0.5 * math.sin(2 * math.pi * 294 * t)
        frames.append(128 + int(6 * swell * tone))              # very quiet, 8-bit unsigned
    w.writeframes(bytes(frames))
print(OUT, os.path.getsize(OUT) // 1024, "KB")
