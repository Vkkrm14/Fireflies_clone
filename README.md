# Fireflies.ai Clone

A full-stack clone of the [Fireflies.ai](https://fireflies.ai) meeting-assistant workspace. Browse a library of past meetings, open one to read an interactive transcript that stays in sync with a media player, and review the AI-style summary, chapters and action items alongside it. Meetings can be created from a pasted or uploaded transcript, edited, searched, tagged, commented on and exported.

Speech-to-text and live-call bots are out of scope, so meetings come from seeded data or from a `.txt`, `.vtt` or `.json` transcript you provide. The UI follows the real app's layout, routes and dark theme.

**Live demo:** https://fireflies-clone-beryl.vercel.app

> The API runs on a free Render instance that sleeps when idle, so the first load can take up to a minute. Data created in the demo is reset when the instance restarts.

### Highlights

- **Meetings library:** search by title, filter by date, participant and tag, sort by recency or length.
- **Interactive transcript:** click a line to seek the player, and the transcript highlights and scrolls as the audio plays. Find-in-transcript with next and previous.
- **Summary and notes:** overview, key topics, chapters that jump to their timestamp, and editable action items.
- **Meeting management:** create, rename, edit participants and date, delete; everything persists in SQLite.
- **Bonus:** global search grouped by meeting, comments and soundbites, tags, export to txt, md or json, extractive "ask about this meeting", and keyboard shortcuts.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript), CSS Modules, SWR, Zustand, Radix UI, lucide-react, date-fns |
| Backend | Python, FastAPI, Pydantic 2 |
| Database | SQLite through SQLAlchemy 2 |
| Tests | `node --test` (frontend logic), `pytest` (backend API) |

## Architecture

```
Browser (Next.js, port 3000)
   |  fetch / SWR      REST + JSON, multipart for uploads
   v
FastAPI (port 8000)    routes/  ->  services/  ->  models/ (SQLAlchemy)  ->  SQLite file
                       schemas/ validate input and shape output
                       /media/*  placeholder audio with HTTP Range support
```

- `backend/routes` hold HTTP concerns only. `backend/services` hold logic with no HTTP in it: the transcript parsers (`.txt`, `.vtt`, `.json`), the template summary generator, the exporter and the extractive question answering.
- `frontend/src/app` mirrors Fireflies' own URLs. `frontend/src/components` splits into `layout`, `ui` (shared primitives), `meetings` (library) and `notebook` (meeting detail). `frontend/src/lib` has the API client, SWR hooks, stores and pure helpers, each with unit tests.
- Datetimes are stored as naive UTC and always sent as ISO strings ending in `Z`, so a meeting shows the same instant in every time zone.

### Routes (mirroring app.fireflies.ai)

| URL | Page |
|---|---|
| `/` | Home: greeting, summary cards, Recent / Upcoming / AI Feed |
| `/notebook/mine-shared`, `/all`, `/autopilot`, `/uploads` | Meetings library by channel |
| `/notebook/[id]` and `/view/Title::id` | One meeting: notes, transcript, player |
| `/welcome/tasks`, `/skills`, `/analytics`, `/agents`, `/integrations`, `/team`, `/upgrade`, `/ask-fred` | Placeholders ("Coming soon") |
| `/settings/[[...subroute]]` | Settings with its own left nav |
| `/search/[query]` | Global search, grouped by meeting; a transcript hit opens the meeting at that line (`/notebook/[id]?t=<seconds>`) |

## Database schema

```
users 1---* meetings 1---* meeting_participants
                    1---* transcript_segments 1---* comments
                    1---1 summaries            (key_topics, chapters stored as JSON text)
                    1---* action_items
                    1---* comments, soundbites
                    *---* tags   (through meeting_tags)
```

| Table | Key columns |
|---|---|
| `users` | `id`, `name`, `email` (unique), `avatar_url` |
| `meetings` | `id`, `title`, `date`, `duration` (seconds), `status`, `media_url`, `created_by` -> users |
| `meeting_participants` | `meeting_id` -> meetings (cascade), `name`, `role` (host / participant), `avatar_color` |
| `transcript_segments` | `meeting_id` (cascade), `speaker_name`, `start_time`, `end_time`, `text`, `segment_index` |
| `summaries` | `meeting_id` (unique, cascade), `overview`, `key_topics`, `chapters`, `generated_at` |
| `action_items` | `meeting_id` (cascade), `text`, `assignee`, `is_completed`, `due_date` |
| `tags`, `meeting_tags` | unique lower-case tag name; junction with composite primary key, both sides cascade |
| `comments` | `meeting_id`, `segment_id` -> transcript_segments (both cascade), `author`, `text` |
| `soundbites` | `meeting_id` (cascade), `title`, `start_time`, `end_time` |

Indexes: `idx_meetings_date`, `idx_transcript_meeting (meeting_id, segment_index)`, `idx_action_items_meeting`, `idx_participants_meeting`, `idx_participants_name`, `idx_comments_meeting`, `idx_soundbites_meeting`, `idx_meeting_tags_tag`. Deleting a meeting removes everything under it.

## API overview

Interactive docs are served at `http://localhost:8000/docs`.

| Method and path | Purpose |
|---|---|
| `GET /api/meetings` | List. Query: `search`, `sort` (newest/oldest/longest/shortest), `participant`, `tag`, `date_from`, `date_to`, `page`, `page_size` |
| `POST /api/meetings` | Create from a form: `title`, `date`, `participants` (JSON array), optional `duration`, and `transcript_text` or `transcript_file`. Parses the transcript and generates a summary |
| `GET / PUT / DELETE /api/meetings/{id}` | Detail (with transcript, summary, action items, tags), update title / date / participants, delete |
| `GET / POST /api/meetings/{id}/transcript` | Read or replace the transcript from an uploaded file |
| `GET /api/meetings/{id}/transcript/search?q=` | Matches inside one transcript |
| `GET /api/meetings/{id}/summary`, `POST .../summary/generate` | Read or regenerate the summary |
| `GET / POST /api/meetings/{id}/action-items`, `PUT / DELETE .../{item_id}` | Action item CRUD |
| `GET /api/search?q=` | Global search across titles, transcripts and summaries |
| `GET /api/meetings/{id}/export?kind=transcript\|summary&format=txt\|md\|json` | File download |
| `GET /api/tags`, `PUT /api/meetings/{id}/tags` | Tags |
| `GET / POST /api/meetings/{id}/comments`, `DELETE .../{comment_id}` | Transcript comments |
| `GET /api/soundbites`, `GET / POST /api/meetings/{id}/soundbites`, `DELETE .../{id}` | Soundbites |
| `POST /api/meetings/{id}/ask` | Ask about a meeting. Extractive: returns the best-matching transcript lines with timestamps, no LLM |
| `GET /api/users/me` | The default logged-in user |
| `GET /media/{file}` | Placeholder audio, Range requests supported |

## Setup

Prerequisites: Node 22.6+ (the frontend unit tests run TypeScript directly through `node --experimental-strip-types`), Python 3.11+.

```bash
# Backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000                 # creates fireflies.db and seeds it on first start

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                                           # http://localhost:3000
```

The seed gives six meetings with 20 to 23 transcript segments each, summaries, action items, tags and participants. To start over, delete `backend/fireflies.db` and restart the backend. A database created before the review fixes lacks `AUTOINCREMENT` ids, so delete and reseed it once.

Environment variables:

| Variable | Where | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` |
| `DATABASE_URL` | backend | `backend/fireflies.db` next to `main.py`, as a SQLite URL. Any SQLAlchemy SQLite URL overrides it |
| `CORS_ORIGINS` | backend | localhost:3000 only. Comma-separated list of extra allowed origins |

### Tests

```bash
cd frontend && npm test && npx tsc --noEmit && npx eslint src
cd backend && pip install -r requirements-dev.txt && python -m pytest tests
```

Backend tests run against a throwaway database, never `fireflies.db`. `tests/test_hardening.py` covers the bad-input cases: nulls on updates, malformed or oversized transcript uploads, search wildcards, non-Latin export filenames.

## Features

**Core:** meetings library with search, sort, filters and participant filter; meeting detail with speaker-labelled transcript, a player whose seek bar, play state and transcript highlight stay in sync (click a line or a chapter to jump); find-in-transcript with next/previous; summary, key topics, chapters and action items; create (paste or upload `.txt`, `.vtt`, `.json`), edit, rename and delete meetings; add, edit, tick off and delete action items; toasts, modals, notifications menu, settings and "Coming soon" placeholders.

**Bonus:** global search, export (txt / md / json), tags with filtering, transcript comments, soundbites, ask-about-this-meeting (extractive), keyboard shortcuts (`Ctrl+K` search, `Ctrl+J` AskFred, `Space` play and pause). The app is dark, as Fireflies is.

## Assumptions and limits

- Invalid input is answered with 422 and a readable message, never a 500: blank titles, negative durations, unknown `status` or `sort`, nulls in updates, `.pdf` or empty uploads, and `NaN` or `Infinity` timestamps in a JSON transcript. A transcript upload is limited to 5 MB and to `.txt`, `.vtt` and `.json`. A failed upload leaves the existing transcript untouched.
- Replacing a transcript also refreshes the meeting duration and summary, and removes comments, since they were attached to lines that no longer exist. SQLite foreign keys are switched on so deletes cascade.
- `/design-system` (a component gallery) is only served in development.
- No authentication: everything runs as the default user "Alex Johnson".
- The audio is a generated placeholder tone (`backend/scripts/make_sample_audio.py`), shared by all meetings. A real recording can be dropped into `backend/media/` and referenced through `media_url`.
- Summaries are template-generated and ask-about-this-meeting is keyword retrieval. Neither calls an LLM.
- Channels, AI Skills, analytics, voice agents, team features and integrations are placeholders, as the brief allows.
- The sentiment panel in the real notebook is not reproduced: it would need invented scores.
- Fireflies uses GraphQL internally; this clone exposes REST.

## Deployment

Frontend on Vercel (root directory `frontend`, env `NEXT_PUBLIC_API_URL` = the backend URL). Backend on Render or Railway: `backend/Dockerfile` is included, or run `pip install -r requirements.txt` and `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `CORS_ORIGINS` to the Vercel URL. SQLite lives on the service disk, so the seed data is recreated on a fresh instance; attach a persistent disk if you want user-created meetings to survive redeploys.
