"""
Seed script — populates the database with realistic Fireflies-style meeting data.
Run: python database/seed.py  (from the backend/ directory)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, timezone
import json
import math
from database.session import engine, SessionLocal
from database.session import init_db
from models.user import User
from models.meeting import Meeting, MeetingParticipant
from models.transcript import TranscriptSegment
from models.summary import Summary
from models.action_item import ActionItem
from models.tag import Tag

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SPEAKER_COLORS = [
    "#6c5ce7", "#00b894", "#0984e3", "#e17055",
    "#fdcb6e", "#e84393", "#00cec9", "#a29bfe",
]

def make_segments(meeting_id: int, speakers: list[dict], lines: list[dict]) -> list[TranscriptSegment]:
    """Build TranscriptSegment objects from raw line data."""
    color_map = {s["name"]: s["color"] for s in speakers}
    segs = []
    for i, line in enumerate(lines):
        segs.append(TranscriptSegment(
            meeting_id=meeting_id,
            speaker_name=line["speaker"],
            speaker_color=color_map.get(line["speaker"], SPEAKER_COLORS[0]),
            start_time=line["start"],
            end_time=line["end"],
            text=line["text"],
            segment_index=i,
        ))
    return segs


def extend_lines(lines: list[dict], extra: list[tuple[str, str]]) -> list[dict]:
    """Insert extra (speaker, text) exchanges before the final two lines and re-time the tail.

    Earlier segments are untouched, so chapter start times stay valid.
    """
    body, tail = lines[:-2], lines[-2:]
    out = list(body)
    t = body[-1]["end"]
    for speaker, text in [*extra, *((l["speaker"], l["text"]) for l in tail)]:
        length = round(max(8.0, len(text) * 0.075), 1)
        out.append({"speaker": speaker, "start": round(t, 1), "end": round(t + length, 1), "text": text})
        t += length
    return out


# ---------------------------------------------------------------------------
# Meeting 1 — Q3 Product Roadmap Review
# ---------------------------------------------------------------------------
M1_SPEAKERS = [
    {"name": "Sarah Chen", "color": "#6c5ce7", "role": "host"},
    {"name": "Marcus Williams", "color": "#00b894", "role": "participant"},
    {"name": "Priya Patel", "color": "#0984e3", "role": "participant"},
    {"name": "Tom Richards", "color": "#e17055", "role": "participant"},
]

M1_LINES = [
    {"speaker": "Sarah Chen", "start": 0.0, "end": 12.4, "text": "Good morning everyone. Thanks for joining the Q3 roadmap review. We have a lot to cover today, so let's get started."},
    {"speaker": "Marcus Williams", "start": 12.4, "end": 20.1, "text": "Thanks Sarah. I've prepared the velocity report from last sprint. We're tracking at 87% of our planned story points."},
    {"speaker": "Priya Patel", "start": 20.1, "end": 31.8, "text": "That's actually better than last quarter. I think the new sprint planning process is paying off. We should consider keeping the two-week retrospectives."},
    {"speaker": "Tom Richards", "start": 31.8, "end": 45.2, "text": "Agreed. From the infrastructure side, we've resolved the latency issues with the API gateway. Response times are down to 120ms average from 340ms."},
    {"speaker": "Sarah Chen", "start": 45.2, "end": 58.6, "text": "Excellent news on the latency. Now let's talk about the three big features we planned for Q3. First up is the AI-powered search."},
    {"speaker": "Marcus Williams", "start": 58.6, "end": 75.3, "text": "AI search is about 60% done. We have the indexing pipeline working but the relevance scoring needs more tuning. We expect to ship a beta by end of week three."},
    {"speaker": "Priya Patel", "start": 75.3, "end": 89.1, "text": "I've been testing the beta and the results are promising. One thing I'd suggest is adding semantic search capabilities alongside the keyword matching."},
    {"speaker": "Tom Richards", "start": 89.1, "end": 104.7, "text": "Semantic search would require embedding storage. We could use pgvector if we move to Postgres or a separate vector DB like Pinecone. What's the infra budget looking like?"},
    {"speaker": "Sarah Chen", "start": 104.7, "end": 120.3, "text": "We have some flexibility there. Let me action Marcus to put together a technical spec comparing the two approaches by next Friday."},
    {"speaker": "Marcus Williams", "start": 120.3, "end": 135.9, "text": "I can do that. I'll include cost projections and latency benchmarks. Should I loop in the ML team as well?"},
    {"speaker": "Sarah Chen", "start": 135.9, "end": 148.2, "text": "Yes, include Ravi from ML. Now moving on to feature two — the collaborative workspace. Priya, you're leading this one."},
    {"speaker": "Priya Patel", "start": 148.2, "end": 165.8, "text": "Right. Collaborative workspace is in early design phase. We've completed user research — interviewed 12 customers. The top ask is real-time co-editing similar to Notion."},
    {"speaker": "Tom Richards", "start": 165.8, "end": 182.4, "text": "Real-time co-editing adds significant complexity. We'd need WebSocket infrastructure and conflict resolution logic. I'd estimate 6-8 weeks of backend work minimum."},
    {"speaker": "Marcus Williams", "start": 182.4, "end": 198.1, "text": "That timeline feels about right for the backend. Frontend-wise we're looking at maybe 4 weeks for the operational transforms or CRDT implementation."},
    {"speaker": "Sarah Chen", "start": 198.1, "end": 215.7, "text": "Okay so realistically collaborative workspace is a Q4 feature. Let's move the timeline and focus Q3 resources on AI search and the mobile app improvements."},
    {"speaker": "Priya Patel", "start": 215.7, "end": 231.2, "text": "Sounds sensible. For mobile, the main issues from user feedback are the loading performance and the dark mode support. Both should be achievable within Q3."},
    {"speaker": "Tom Richards", "start": 231.2, "end": 247.9, "text": "I can help with the mobile performance work. We should look at lazy loading and bundle splitting first — those tend to have the highest ROI."},
    {"speaker": "Sarah Chen", "start": 247.9, "end": 264.5, "text": "Let's assign that to Tom and Priya as a pair. I want a performance report showing before and after metrics. Target 40% improvement in initial load time."},
    {"speaker": "Marcus Williams", "start": 264.5, "end": 279.8, "text": "Should we set up a performance monitoring dashboard? I can configure Grafana to track key metrics automatically so we can catch regressions early."},
    {"speaker": "Sarah Chen", "start": 279.8, "end": 295.1, "text": "Great idea. Marcus, please set that up alongside the tech spec. Alright, let's do final round — any blockers?"},
    {"speaker": "Tom Richards", "start": 295.1, "end": 309.4, "text": "One blocker — we're still waiting on AWS quota increase for the new EC2 instances. I've escalated but the support ticket has been open for 5 days."},
    {"speaker": "Priya Patel", "start": 309.4, "end": 321.7, "text": "I have a contact at AWS enterprise support. Let me reach out directly this afternoon — should cut the resolution time significantly."},
    {"speaker": "Sarah Chen", "start": 321.7, "end": 336.0, "text": "Perfect. Thanks everyone for a great session. Action items are captured and I'll send the meeting notes within the hour. Have a great rest of your day."},
]

M1_SUMMARY = {
    "overview": "The Q3 product roadmap review covered three major initiatives: AI-powered search (60% complete, beta targeting week 3), collaborative workspace (moved to Q4 due to complexity), and mobile app performance improvements. Key decisions included pursuing vector DB evaluation, reassigning collaborative workspace to Q4, and setting a 40% load time improvement target for mobile. Infrastructure updates showed significant API latency reduction from 340ms to 120ms.",
    "key_topics": ["AI Search", "Collaborative Workspace", "Mobile Performance", "Infrastructure", "Q3 Roadmap", "Vector Database", "Sprint Velocity"],
    "chapters": [
        {"title": "Sprint Velocity & Infrastructure Update", "start_time": 0.0},
        {"title": "AI-Powered Search Feature Review", "start_time": 45.2},
        {"title": "Collaborative Workspace Discussion", "start_time": 135.9},
        {"title": "Mobile App Performance", "start_time": 215.7},
        {"title": "Blockers & Wrap-up", "start_time": 279.8},
    ],
}

M1_ACTIONS = [
    {"text": "Prepare technical spec comparing pgvector vs Pinecone for semantic search", "assignee": "Marcus Williams", "is_completed": False},
    {"text": "Loop in Ravi from ML team on AI search architecture", "assignee": "Marcus Williams", "is_completed": True},
    {"text": "Update Q3 roadmap — move collaborative workspace to Q4", "assignee": "Sarah Chen", "is_completed": True},
    {"text": "Implement lazy loading and bundle splitting for mobile app", "assignee": "Tom Richards", "is_completed": False},
    {"text": "Set up Grafana performance monitoring dashboard", "assignee": "Marcus Williams", "is_completed": False},
    {"text": "Contact AWS enterprise support to expedite EC2 quota increase", "assignee": "Priya Patel", "is_completed": True},
]

# ---------------------------------------------------------------------------
# Meeting 2 — Engineering Sprint Planning #42
# ---------------------------------------------------------------------------
M2_SPEAKERS = [
    {"name": "Jordan Lee", "color": "#6c5ce7", "role": "host"},
    {"name": "Aisha Okonkwo", "color": "#00b894", "role": "participant"},
    {"name": "Devon Park", "color": "#0984e3", "role": "participant"},
]

M2_LINES = [
    {"speaker": "Jordan Lee", "start": 0.0, "end": 14.2, "text": "Alright team, sprint planning for sprint 42. Let's review the backlog and commit to what we can deliver in the next two weeks."},
    {"speaker": "Aisha Okonkwo", "start": 14.2, "end": 28.9, "text": "Our current velocity is 48 story points. Given we have a company all-hands on Thursday and some PTO, I'd suggest we plan for around 40 points this sprint."},
    {"speaker": "Devon Park", "start": 28.9, "end": 42.7, "text": "I agree with that estimate. I also want to flag that I'll need at least 3 days to finish the payment gateway refactor that carried over from last sprint."},
    {"speaker": "Jordan Lee", "start": 42.7, "end": 57.3, "text": "Understood Devon. Let's account for that. The payment gateway is P0 so it takes priority. Aisha, can you pick up the user dashboard redesign?"},
    {"speaker": "Aisha Okonkwo", "start": 57.3, "end": 71.8, "text": "Yes, I've reviewed the Figma designs. The dashboard redesign is about 13 story points. I'll also take the notification preferences feature — that's 8 points."},
    {"speaker": "Devon Park", "start": 71.8, "end": 86.2, "text": "Once I wrap the payment gateway I can jump onto the API rate limiting ticket. That's been sitting in the backlog for two sprints and clients are complaining."},
    {"speaker": "Jordan Lee", "start": 86.2, "end": 101.7, "text": "Good call. Rate limiting is important for reliability. I'll take the authentication service upgrade and the CI/CD pipeline improvements — roughly 12 points combined."},
    {"speaker": "Aisha Okonkwo", "start": 101.7, "end": 116.4, "text": "Do we have clarity on the authentication spec? Last sprint we were blocked waiting for the security team sign-off on the JWT refresh token strategy."},
    {"speaker": "Jordan Lee", "start": 116.4, "end": 131.9, "text": "Good catch. I got the sign-off email yesterday. The security team approved the sliding window approach for refresh tokens. I'll share the doc in Slack after this call."},
    {"speaker": "Devon Park", "start": 131.9, "end": 147.2, "text": "Excellent. One more thing — we should add a ticket for updating our error monitoring setup. We've been missing some edge cases in production. Maybe 5 points?"},
    {"speaker": "Jordan Lee", "start": 147.2, "end": 162.8, "text": "Add it in. We'll fit it in after the core items are done. Total sprint commitment is around 38 points which gives us a small buffer. Everyone aligned?"},
    {"speaker": "Aisha Okonkwo", "start": 162.8, "end": 175.1, "text": "Aligned. One quick reminder — we should update the definition of done to include unit test coverage thresholds. We discussed this last retro."},
    {"speaker": "Devon Park", "start": 175.1, "end": 188.5, "text": "Agreed. I'd say 80% coverage as minimum for new code. Should we add that to the sprint ceremonies doc?"},
    {"speaker": "Jordan Lee", "start": 188.5, "end": 200.7, "text": "Yes, let's formalize that. I'll update the engineering handbook before our standup tomorrow. Great planning session everyone — see you at standup!"},
]

M2_LINES = extend_lines(M2_LINES, [('Aisha Okonkwo', 'Before we close, can we agree on how we handle mid-sprint scope changes? Last sprint two urgent tickets landed on day three and it threw off the whole plan.'), ('Jordan Lee', "Fair point. Let's set a rule: anything new goes through me first, and unless it's a P0 production issue it waits for the next sprint."), ('Devon Park', "That works for me. Could we also reserve about 10% of capacity for unplanned work? It's realistic given how many support escalations we get."), ('Aisha Okonkwo', "I like the buffer idea. Let's track how much of it we actually burn so we can tune the number at the retro."), ('Jordan Lee', "Agreed, I'll add a buffer column to the sprint board. Devon, can you also document the rate limiting approach before you start coding?"), ('Devon Park', "Sure, I'll write a short design note covering the token bucket approach and the headers we plan to return, and share it for review on Wednesday.")])

M2_SUMMARY = {
    "overview": "Sprint 42 planning session resulted in a commitment of 38 story points, adjusted from the 48-point velocity to account for the all-hands meeting and PTO. Key items include completing the payment gateway refactor (Devon, P0), user dashboard redesign and notification preferences (Aisha), and authentication service upgrade plus CI/CD improvements (Jordan). The team also agreed to formalize an 80% unit test coverage requirement in the definition of done.",
    "key_topics": ["Sprint Planning", "Payment Gateway", "Authentication", "Dashboard Redesign", "Rate Limiting", "Testing Coverage", "CI/CD"],
    "chapters": [
        {"title": "Sprint Capacity & Velocity Review", "start_time": 0.0},
        {"title": "Story Point Assignments", "start_time": 42.7},
        {"title": "Authentication Sign-off Update", "start_time": 101.7},
        {"title": "Definition of Done Update", "start_time": 162.8},
    ],
}

M2_ACTIONS = [
    {"text": "Complete payment gateway refactor (P0, carry-over)", "assignee": "Devon Park", "is_completed": False},
    {"text": "Share JWT refresh token security approval doc in Slack", "assignee": "Jordan Lee", "is_completed": True},
    {"text": "Implement user dashboard redesign (13 pts)", "assignee": "Aisha Okonkwo", "is_completed": False},
    {"text": "Update engineering handbook with 80% test coverage requirement", "assignee": "Jordan Lee", "is_completed": False},
    {"text": "Set up API rate limiting for external clients", "assignee": "Devon Park", "is_completed": False},
]

# ---------------------------------------------------------------------------
# Meeting 3 — Customer Onboarding Call — Acme Corp
# ---------------------------------------------------------------------------
M3_SPEAKERS = [
    {"name": "Rachel Kim", "color": "#6c5ce7", "role": "host"},
    {"name": "David Osei", "color": "#e17055", "role": "participant"},
    {"name": "Lisa Tanaka", "color": "#fdcb6e", "role": "participant"},
]

M3_LINES = [
    {"speaker": "Rachel Kim", "start": 0.0, "end": 16.3, "text": "Welcome to Fireflies David, Lisa! I'm Rachel, your customer success manager. Today we'll walk through your workspace setup and answer any questions you have."},
    {"speaker": "David Osei", "start": 16.3, "end": 30.1, "text": "Thanks Rachel, excited to get started. We've been looking for a meeting intelligence solution for a while. Our main use case is sales call analysis."},
    {"speaker": "Lisa Tanaka", "start": 30.1, "end": 45.8, "text": "Yes, and we want to make sure the integration with our CRM — we use Salesforce — is seamless. That's a big requirement for us."},
    {"speaker": "Rachel Kim", "start": 45.8, "end": 62.4, "text": "Perfect. Salesforce integration is one of our most popular integrations. I'll walk you through the setup. First, let's connect your Google Workspace so Fred can join your meetings automatically."},
    {"speaker": "David Osei", "start": 62.4, "end": 76.9, "text": "We use both Google Meet and Zoom depending on the client. Can Fred handle both?"},
    {"speaker": "Rachel Kim", "start": 76.9, "end": 92.5, "text": "Absolutely. Fred works with Google Meet, Zoom, Microsoft Teams, and Webex. You can configure it to join all meetings or only specific ones based on keywords or attendees."},
    {"speaker": "Lisa Tanaka", "start": 92.5, "end": 107.2, "text": "That flexibility is great. One concern we have is data privacy. Our sales calls sometimes include sensitive pricing and contract information."},
    {"speaker": "Rachel Kim", "start": 107.2, "end": 123.8, "text": "Totally understand. Fireflies is SOC 2 Type II certified and GDPR compliant. All data is encrypted at rest and in transit. You also have full control to delete any recording at any time."},
    {"speaker": "David Osei", "start": 123.8, "end": 138.4, "text": "That's reassuring. Can we restrict which team members have access to recordings? Our VP of Sales wants certain calls to be executive-only."},
    {"speaker": "Rachel Kim", "start": 138.4, "end": 154.1, "text": "Yes, you have granular permission controls. You can set meetings as private, share with specific team members, or make them visible to your entire workspace."},
    {"speaker": "Lisa Tanaka", "start": 154.1, "end": 168.7, "text": "What about the AI summaries? How accurate are they for sales calls specifically? We tried another tool and the summaries were quite generic."},
    {"speaker": "Rachel Kim", "start": 168.7, "end": 185.3, "text": "Great question. Fireflies has sales-specific templates — BANT, MEDDIC, SPICED — that structure the summary around sales-relevant information like budget, timeline, and next steps."},
    {"speaker": "David Osei", "start": 185.3, "end": 199.8, "text": "That's exactly what we need! Can we customize those templates or create our own?"},
    {"speaker": "Rachel Kim", "start": 199.8, "end": 215.2, "text": "Custom templates are available on the Business plan which you're on. I'll send you the template editor guide after this call. It's very intuitive."},
    {"speaker": "Lisa Tanaka", "start": 215.2, "end": 229.6, "text": "Perfect. I think we're ready to get everything set up. What's the recommended onboarding sequence?"},
    {"speaker": "Rachel Kim", "start": 229.6, "end": 245.0, "text": "I'll send a detailed onboarding checklist but the key steps are: connect your calendar, install the browser extension, configure Salesforce sync, and invite your team. Usually takes 30 minutes."},
    {"speaker": "David Osei", "start": 245.0, "end": 257.3, "text": "Sounds manageable. Is there a dedicated support channel if we run into issues during rollout?"},
    {"speaker": "Rachel Kim", "start": 257.3, "end": 270.0, "text": "Yes, you have access to our priority support channel and your dedicated CSM — that's me! You can book follow-up calls anytime via my Calendly link. Great connecting today!"},
]

M3_LINES = extend_lines(M3_LINES, [('David Osei', 'One more question on security. Our compliance team will ask where the recordings are stored and how long they are retained.'), ('Rachel Kim', "Great question. Recordings are encrypted at rest and in transit, and you can set a retention policy per workspace. I'll send our security whitepaper and SOC 2 report today.")])

M3_SUMMARY = {
    "overview": "Customer onboarding call with Acme Corp (David Osei and Lisa Tanaka). The session covered their primary use case of sales call analysis, Salesforce CRM integration setup, data privacy and security compliance (SOC 2 Type II, GDPR), permission controls, and AI summary templates for sales (BANT, MEDDIC). Rachel walked them through the onboarding sequence and committed to sending template guides and an onboarding checklist.",
    "key_topics": ["Salesforce Integration", "Data Privacy", "SOC 2 Compliance", "Sales Templates", "BANT", "Permission Controls", "Onboarding"],
    "chapters": [
        {"title": "Welcome & Use Case Discovery", "start_time": 0.0},
        {"title": "Platform Integrations Overview", "start_time": 62.4},
        {"title": "Security & Privacy Discussion", "start_time": 107.2},
        {"title": "AI Summary Templates for Sales", "start_time": 154.1},
        {"title": "Onboarding Next Steps", "start_time": 215.2},
    ],
}

M3_ACTIONS = [
    {"text": "Send Salesforce integration setup guide to David and Lisa", "assignee": "Rachel Kim", "is_completed": True},
    {"text": "Share custom template editor documentation", "assignee": "Rachel Kim", "is_completed": True},
    {"text": "Send detailed onboarding checklist (30-min setup)", "assignee": "Rachel Kim", "is_completed": False},
    {"text": "Complete workspace setup: calendar, extension, Salesforce, team invite", "assignee": "David Osei", "is_completed": False},
    {"text": "Configure executive-only permission settings for sensitive calls", "assignee": "Lisa Tanaka", "is_completed": False},
]

# ---------------------------------------------------------------------------
# Meeting 4 — Design System Sync
# ---------------------------------------------------------------------------
M4_SPEAKERS = [
    {"name": "Maya Rodriguez", "color": "#e84393", "role": "host"},
    {"name": "Chris Thompson", "color": "#00cec9", "role": "participant"},
    {"name": "Zara Ahmed", "color": "#a29bfe", "role": "participant"},
]

M4_LINES = [
    {"speaker": "Maya Rodriguez", "start": 0.0, "end": 13.5, "text": "Hey team, thanks for jumping on. Quick design system sync — we need to align on the component library migration before we branch for the new quarter."},
    {"speaker": "Chris Thompson", "start": 13.5, "end": 27.2, "text": "I've been looking at the Storybook docs. We currently have 47 components and I've identified 12 that need to be updated to use the new design tokens."},
    {"speaker": "Zara Ahmed", "start": 27.2, "end": 42.8, "text": "From the design side, I've finalized the new token system in Figma. Colors, spacing, and typography are all documented. Should I export them as a JSON file for the dev team?"},
    {"speaker": "Maya Rodriguez", "start": 42.8, "end": 57.4, "text": "Yes please, JSON export would be perfect. Chris, you can use Style Dictionary to transform them into CSS variables, right?"},
    {"speaker": "Chris Thompson", "start": 57.4, "end": 72.1, "text": "Exactly. I've done that before — usually takes a couple of hours to set up the transform config. The output will be CSS custom properties and TypeScript constants."},
    {"speaker": "Zara Ahmed", "start": 72.1, "end": 87.6, "text": "I also want to discuss the icon library. We're using three different icon sets across the app right now which is inconsistent. I'd like to standardize on Phosphor icons."},
    {"speaker": "Maya Rodriguez", "start": 87.6, "end": 102.3, "text": "Phosphor is a good choice — consistent style, MIT licensed, and has a React package. Chris, how much effort to replace the icons across the app?"},
    {"speaker": "Chris Thompson", "start": 102.3, "end": 117.8, "text": "It depends on how many usages. If I write a codemod script it could be mostly automated. Maybe 2-3 days for a thorough replacement with visual QA."},
    {"speaker": "Zara Ahmed", "start": 117.8, "end": 132.4, "text": "I'll create a mapping document — old icon to new Phosphor equivalent — to help Chris with the codemod. Should have it done by end of day."},
    {"speaker": "Maya Rodriguez", "start": 132.4, "end": 147.1, "text": "Perfect. Let's also talk about the button component. The current implementation has 6 variants and it's getting complex. Can we simplify to 4?"},
    {"speaker": "Chris Thompson", "start": 147.1, "end": 161.5, "text": "Which 4? I'd keep primary, secondary, ghost, and danger. We can drop the subtle and the inverse since they're rarely used."},
    {"speaker": "Zara Ahmed", "start": 161.5, "end": 175.9, "text": "Agreed on the four variants. I'll update the Figma file to remove the deprecated ones and add deprecation notices so designers stop using them."},
    {"speaker": "Maya Rodriguez", "start": 175.9, "end": 190.2, "text": "Great alignment. Last item — the dark mode implementation. We promised users in the roadmap that dark mode comes in Q3. Where are we?"},
    {"speaker": "Chris Thompson", "start": 190.2, "end": 205.7, "text": "With the new token system it'll actually be straightforward — we just swap the token values. I estimate 4-5 days once the token migration is complete."},
    {"speaker": "Zara Ahmed", "start": 205.7, "end": 218.3, "text": "I've already designed the dark mode palette in Figma. The tokens are ready to be exported once you give the go-ahead Maya."},
    {"speaker": "Maya Rodriguez", "start": 218.3, "end": 230.0, "text": "Amazing work Zara. Let's do the export today and Chris can start the token migration. Dark mode becomes our sprint 43 flagship feature. Great sync everyone!"},
]

M4_LINES = extend_lines(M4_LINES, [('Chris Thompson', "We should also add visual regression tests to the pipeline. With 47 components and a token migration, we'll want to catch unintended changes automatically."), ('Maya Rodriguez', 'Good call. Zara, can you help Chris define which Storybook stories are the critical ones for the baseline snapshots?'), ('Zara Ahmed', "Of course. I'll mark the top 15 components by usage, since those carry the most risk if something shifts."), ('Chris Thompson', "Perfect. I'll wire Chromatic into CI once the baseline is in place, and the first run will double as our audit of the migration.")])

M4_SUMMARY = {
    "overview": "Design system sync covered four key areas: component library migration to new design tokens (12 components need updates), icon library standardization to Phosphor Icons (codemod approach), button component simplification from 6 to 4 variants (primary, secondary, ghost, danger), and dark mode implementation planning. With the token-first approach, dark mode is estimated at 4-5 days once migration completes — targeting sprint 43.",
    "key_topics": ["Design Tokens", "Component Library", "Storybook", "Icon Library", "Dark Mode", "Style Dictionary", "Button Variants"],
    "chapters": [
        {"title": "Component Library Status", "start_time": 0.0},
        {"title": "Token System & Icon Library", "start_time": 57.4},
        {"title": "Button Component Simplification", "start_time": 132.4},
        {"title": "Dark Mode Planning", "start_time": 175.9},
    ],
}

M4_ACTIONS = [
    {"text": "Export design tokens as JSON from Figma", "assignee": "Zara Ahmed", "is_completed": True},
    {"text": "Set up Style Dictionary transform config for CSS variables", "assignee": "Chris Thompson", "is_completed": False},
    {"text": "Create icon mapping document (old icons → Phosphor equivalents)", "assignee": "Zara Ahmed", "is_completed": True},
    {"text": "Write codemod script for icon replacement across codebase", "assignee": "Chris Thompson", "is_completed": False},
    {"text": "Update Figma with 4-variant button and deprecate old variants", "assignee": "Zara Ahmed", "is_completed": False},
    {"text": "Start token migration so dark mode can be implemented in Sprint 43", "assignee": "Chris Thompson", "is_completed": False},
]

# ---------------------------------------------------------------------------
# Meeting 5 — Weekly All-Hands
# ---------------------------------------------------------------------------
M5_SPEAKERS = [
    {"name": "Sarah Chen", "color": "#6c5ce7", "role": "host"},
    {"name": "Jordan Lee", "color": "#00b894", "role": "participant"},
    {"name": "Rachel Kim", "color": "#0984e3", "role": "participant"},
    {"name": "Maya Rodriguez", "color": "#e84393", "role": "participant"},
]

M5_LINES = [
    {"speaker": "Sarah Chen", "start": 0.0, "end": 15.8, "text": "Good morning everyone and welcome to our weekly all-hands. Huge week — we hit 10,000 active users yesterday, which is a major milestone for the team!"},
    {"speaker": "Jordan Lee", "start": 15.8, "end": 30.4, "text": "Congrats team! On the engineering front, sprint 41 closed at 96% completion — our best sprint in six months. No major production incidents."},
    {"speaker": "Rachel Kim", "start": 30.4, "end": 45.9, "text": "Customer success here. NPS score this month is 68, up from 61 last month. Churn rate is at an all-time low of 2.1%. The Acme Corp onboarding went really smoothly."},
    {"speaker": "Maya Rodriguez", "start": 45.9, "end": 60.3, "text": "Design shipped the new onboarding flow last week. Early data shows 35% improvement in activation rate for new users — users are reaching their first 'aha moment' much faster."},
    {"speaker": "Sarah Chen", "start": 60.3, "end": 75.7, "text": "Fantastic numbers across the board. Q3 is shaping up to be our strongest quarter. A reminder that we have company offsites coming up next month in Austin."},
    {"speaker": "Jordan Lee", "start": 75.7, "end": 90.2, "text": "Logistics question — will we have remote participation options for the offsite? We have 4 team members who can't travel due to visa situations."},
    {"speaker": "Sarah Chen", "start": 90.2, "end": 105.6, "text": "Absolutely. We'll have full AV setup for remote participants and all sessions will be recorded. HR is coordinating the hybrid setup — details coming by EOD."},
    {"speaker": "Rachel Kim", "start": 105.6, "end": 120.1, "text": "One announcement from customer success — we're launching the new Fireflies Academy next week. It's a self-serve training portal for customers. Excited to see adoption numbers."},
    {"speaker": "Maya Rodriguez", "start": 120.1, "end": 134.5, "text": "The Academy UI looks great — really proud of what the design team put together. We should do a soft launch blog post as well to drive traffic."},
    {"speaker": "Sarah Chen", "start": 134.5, "end": 150.0, "text": "Good idea Maya. Let's coordinate that with marketing. Jordan, anything from engineering to flag before we close?"},
    {"speaker": "Jordan Lee", "start": 150.0, "end": 164.8, "text": "Just a heads up — we're doing a scheduled maintenance window this Saturday from 2-4am Pacific. Users will see a brief downtime. Notification is going out today."},
    {"speaker": "Sarah Chen", "start": 164.8, "end": 178.2, "text": "Great, make sure enterprise customers get direct email notification, not just the banner. Alright team, have an amazing rest of week — let's keep the momentum going!"},
]

M5_LINES = extend_lines(M5_LINES, [('Maya Rodriguez', "Quick design update: we're running a customer survey on the new onboarding flow this week and I'd love every team to share it with a few of their accounts."), ('Rachel Kim', "Happy to. I'll send it to ten of my accounts today, including a couple that struggled with setup earlier this year."), ('Jordan Lee', "On the engineering side, we're also starting a reliability push. The goal is a 99.95% uptime target for the next quarter, and we'll publish a status page."), ('Sarah Chen', "That's a strong goal. Let's make sure customer success is looped in on incident communication so there are no surprises for accounts."), ('Rachel Kim', 'Yes please. A short incident template would help my team respond within minutes instead of hours.'), ('Jordan Lee', "I'll draft the template this week and review it with you before it goes live."), ('Maya Rodriguez', "Last thing from me, we're hiring a second product designer. If you know anyone great, send them my way."), ('Sarah Chen', 'Thanks Maya. Referral bonuses are in the handbook, so please spread the word.')])

M5_SUMMARY = {
    "overview": "Weekly all-hands celebrated crossing 10,000 active users. Engineering reported their best sprint in 6 months (96% completion), Customer Success showed NPS at 68 (up from 61) and churn at 2.1%, and Design reported 35% improvement in new user activation from the onboarding flow redesign. Key announcements: Austin company offsite next month with hybrid setup, Fireflies Academy self-serve training portal launching next week, and scheduled maintenance Saturday 2-4am Pacific.",
    "key_topics": ["10K Users Milestone", "NPS Score", "Sprint Completion", "Onboarding Flow", "Company Offsite", "Fireflies Academy", "Maintenance Window"],
    "chapters": [
        {"title": "Milestone Announcement", "start_time": 0.0},
        {"title": "Department Updates", "start_time": 30.4},
        {"title": "Company Offsite Planning", "start_time": 75.7},
        {"title": "Fireflies Academy Launch", "start_time": 105.6},
        {"title": "Engineering Updates & Wrap-up", "start_time": 150.0},
    ],
}

M5_ACTIONS = [
    {"text": "Send offsite logistics details to remote participants by EOD", "assignee": "Sarah Chen", "is_completed": True},
    {"text": "Write blog post for Fireflies Academy soft launch", "assignee": "Maya Rodriguez", "is_completed": False},
    {"text": "Send direct email notification to enterprise customers about Saturday maintenance", "assignee": "Jordan Lee", "is_completed": True},
    {"text": "Coordinate Academy launch blog with marketing team", "assignee": "Maya Rodriguez", "is_completed": False},
]

# ---------------------------------------------------------------------------
# Meeting 6 — Data Infrastructure Review
# ---------------------------------------------------------------------------
M6_SPEAKERS = [
    {"name": "Tom Richards", "color": "#e17055", "role": "host"},
    {"name": "Aisha Okonkwo", "color": "#00b894", "role": "participant"},
    {"name": "Marcus Williams", "color": "#6c5ce7", "role": "participant"},
]

M6_LINES = [
    {"speaker": "Tom Richards", "start": 0.0, "end": 14.6, "text": "Thanks for joining the data infra review. We've hit some scaling challenges over the past month and I want to align on solutions before they become critical."},
    {"speaker": "Aisha Okonkwo", "start": 14.6, "end": 29.2, "text": "I've seen the dashboards — query times on the analytics database are spiking during peak hours. Some of our aggregate queries are taking 8-10 seconds."},
    {"speaker": "Marcus Williams", "start": 29.2, "end": 44.8, "text": "I did some profiling last week. The main bottleneck is the meetings table — we have no partitioning and queries are doing full scans even with indexes because of the date range filters."},
    {"speaker": "Tom Richards", "start": 44.8, "end": 60.3, "text": "Right. I'm proposing we partition the meetings table by month. With the data volume we have now, that should reduce query times by 70-80% for time-range queries."},
    {"speaker": "Aisha Okonkwo", "start": 60.3, "end": 75.9, "text": "Partitioning makes sense. What about the full-text search? We're still using LIKE queries for transcript search which doesn't scale at all."},
    {"speaker": "Marcus Williams", "start": 75.9, "end": 91.4, "text": "This connects to my AI search spec work. I think we should move to PostgreSQL's full-text search with tsvectors first — it's much faster and we can migrate to a vector DB later."},
    {"speaker": "Tom Richards", "start": 91.4, "end": 107.0, "text": "I agree with the phased approach. FTS with tsvectors gives us 10-50x speed improvement over LIKE queries and the migration is straightforward. Vector DB we plan for Q4."},
    {"speaker": "Aisha Okonkwo", "start": 107.0, "end": 122.5, "text": "What about the caching layer? We have no caching right now. Meeting detail views with full transcripts are expensive reads that happen repeatedly."},
    {"speaker": "Marcus Williams", "start": 122.5, "end": 138.1, "text": "I'd propose Redis for caching frequently accessed meetings. LRU cache with a 1-hour TTL for meeting detail views. That should dramatically reduce database load."},
    {"speaker": "Tom Richards", "start": 138.1, "end": 153.7, "text": "Good call on Redis. Let's add it to the infra spec. I'll draft the implementation plan covering partitioning, FTS migration, and Redis setup. Timeline thoughts?"},
    {"speaker": "Aisha Okonkwo", "start": 153.7, "end": 168.2, "text": "If we tackle them in parallel — partitioning and FTS can go in sprint 43, Redis in sprint 44. That way we get incremental wins rather than a big bang migration."},
    {"speaker": "Marcus Williams", "start": 168.2, "end": 181.8, "text": "Sounds right. I can take the FTS implementation since it ties into the search work I'm already doing. Tom, are you good with leading the partitioning?"},
    {"speaker": "Tom Richards", "start": 181.8, "end": 195.0, "text": "Absolutely. Aisha, can you lead Redis setup and cache invalidation strategy? Great. Let's sync again in two weeks to review progress. Thanks team!"},
]

M6_LINES = extend_lines(M6_LINES, [('Aisha Okonkwo', "What's our rollback plan if the partition migration goes wrong? I'd hate to find out halfway through that we can't revert."), ('Tom Richards', "We'll run the migration on a snapshot first and keep the old table in place for a week. Cutover happens behind a feature flag so we can flip back instantly."), ('Marcus Williams', "I'd also add query latency alerts. If p95 on the meetings queries goes above two seconds after cutover, we should get paged."), ('Aisha Okonkwo', "I can set those up in Grafana alongside the Redis metrics, it's mostly dashboard work."), ('Tom Richards', "Great. Let's also budget for a load test against production-sized data before the cutover, so we're not guessing about the gains."), ('Marcus Williams', "I'll generate a synthetic dataset with roughly ten times our current volume. That should tell us where the next bottleneck is."), ('Aisha Okonkwo', 'Perfect, that gives us a capacity runway estimate too, which finance has been asking about.')])

M6_SUMMARY = {
    "overview": "Data infrastructure review identified three critical scaling challenges: table partitioning needs for the meetings table (causing 8-10 second query spikes), full-text search replacement for LIKE-based queries, and absence of a caching layer. Solutions agreed: monthly partitioning for the meetings table (70-80% improvement expected), PostgreSQL FTS with tsvectors as a scalable stepping stone toward vector DB, and Redis LRU cache with 1-hour TTL. Implementation planned across sprints 43-44.",
    "key_topics": ["Database Partitioning", "Full-Text Search", "Redis Caching", "Query Performance", "tsvectors", "Scaling", "Infrastructure"],
    "chapters": [
        {"title": "Scaling Challenges Overview", "start_time": 0.0},
        {"title": "Table Partitioning Strategy", "start_time": 44.8},
        {"title": "Full-Text Search Migration", "start_time": 75.9},
        {"title": "Redis Caching Layer", "start_time": 107.0},
        {"title": "Implementation Timeline", "start_time": 153.7},
    ],
}

M6_ACTIONS = [
    {"text": "Draft infra implementation plan: partitioning + FTS + Redis", "assignee": "Tom Richards", "is_completed": False},
    {"text": "Implement PostgreSQL FTS with tsvectors for transcript search", "assignee": "Marcus Williams", "is_completed": False},
    {"text": "Lead table partitioning implementation for meetings table", "assignee": "Tom Richards", "is_completed": False},
    {"text": "Design Redis cache setup and cache invalidation strategy", "assignee": "Aisha Okonkwo", "is_completed": False},
    {"text": "Schedule 2-week follow-up infra review", "assignee": "Tom Richards", "is_completed": True},
]

# ---------------------------------------------------------------------------
# Seed runner
# ---------------------------------------------------------------------------

NOW = datetime.now(timezone.utc)
MEDIA_URL = "/media/sample-meeting.wav"  # placeholder audio served by FastAPI StaticFiles

MEETINGS_DATA = [
    {
        "title": "Q3 Product Roadmap Review",
        "date": NOW - timedelta(days=3),
        "duration": math.ceil(M1_LINES[-1]["end"]),
        "speakers": M1_SPEAKERS,
        "lines": M1_LINES,
        "summary": M1_SUMMARY,
        "actions": M1_ACTIONS,
    },
    {
        "title": "Engineering Sprint Planning #42",
        "date": NOW - timedelta(days=5),
        "duration": math.ceil(M2_LINES[-1]["end"]),
        "speakers": M2_SPEAKERS,
        "lines": M2_LINES,
        "summary": M2_SUMMARY,
        "actions": M2_ACTIONS,
    },
    {
        "title": "Customer Onboarding Call — Acme Corp",
        "date": NOW - timedelta(days=7),
        "duration": math.ceil(M3_LINES[-1]["end"]),
        "speakers": M3_SPEAKERS,
        "lines": M3_LINES,
        "summary": M3_SUMMARY,
        "actions": M3_ACTIONS,
    },
    {
        "title": "Design System Sync",
        "date": NOW - timedelta(days=9),
        "duration": math.ceil(M4_LINES[-1]["end"]),
        "speakers": M4_SPEAKERS,
        "lines": M4_LINES,
        "summary": M4_SUMMARY,
        "actions": M4_ACTIONS,
    },
    {
        "title": "Weekly All-Hands — 10K Users Milestone",
        "date": NOW - timedelta(days=11),
        "duration": math.ceil(M5_LINES[-1]["end"]),
        "speakers": M5_SPEAKERS,
        "lines": M5_LINES,
        "summary": M5_SUMMARY,
        "actions": M5_ACTIONS,
    },
    {
        "title": "Data Infrastructure Scaling Review",
        "date": NOW - timedelta(days=14),
        "duration": math.ceil(M6_LINES[-1]["end"]),
        "speakers": M6_SPEAKERS,
        "lines": M6_LINES,
        "summary": M6_SUMMARY,
        "actions": M6_ACTIONS,
    },
]


TAGS_BY_TITLE = {
    "Q3 Product Roadmap Review": ["roadmap", "planning"],
    "Engineering Sprint Planning #42": ["engineering", "planning"],
    "Customer Onboarding Call": ["customer", "sales"],
    "Design System Sync": ["design", "engineering"],
    "Weekly All-Hands": ["company", "milestone"],
    "Data Infrastructure Scaling Review": ["engineering", "infrastructure"],
}


def tags_for(title: str) -> list[str]:
    for prefix, names in TAGS_BY_TITLE.items():
        if title.startswith(prefix):
            return names
    return []


def run_seed():
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing = db.query(User).filter(User.id == 1).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        # Create default user
        default_user = User(
            name="Alex Johnson",
            email="alex.johnson@fireflies.ai",
            avatar_url=None,
        )
        db.add(default_user)
        db.flush()

        print(f"[OK] Created default user: {default_user.name}")

        tag_cache: dict[str, Tag] = {}
        for meeting_data in MEETINGS_DATA:
            meeting = Meeting(
                title=meeting_data["title"],
                date=meeting_data["date"],
                duration=meeting_data["duration"],
                status="completed",
                media_url=MEDIA_URL,
                created_by=default_user.id,
            )
            db.add(meeting)
            db.flush()

            # Participants
            for sp in meeting_data["speakers"]:
                db.add(MeetingParticipant(
                    meeting_id=meeting.id,
                    name=sp["name"],
                    role=sp["role"],
                    avatar_color=sp["color"],
                ))

            # Transcript segments
            segs = make_segments(meeting.id, meeting_data["speakers"], meeting_data["lines"])
            db.add_all(segs)

            # Summary
            s = meeting_data["summary"]
            db.add(Summary(
                meeting_id=meeting.id,
                overview=s["overview"],
                key_topics=json.dumps(s["key_topics"]),
                chapters=json.dumps(s["chapters"]),
            ))

            # Tags (shared Tag rows, linked through the meeting_tags junction table)
            for name in tags_for(meeting_data["title"]):
                tag = tag_cache.get(name)
                if tag is None:
                    tag = tag_cache[name] = Tag(name=name)
                meeting.tag_objs.append(tag)

            # Action items
            for a in meeting_data["actions"]:
                db.add(ActionItem(
                    meeting_id=meeting.id,
                    text=a["text"],
                    assignee=a.get("assignee"),
                    is_completed=a.get("is_completed", False),
                ))

            print(f"  [OK] Seeded: {meeting_data['title']} ({len(meeting_data['lines'])} segments)")

        db.commit()
        print("\nDatabase seeded successfully with 6 meetings, 6 summaries, and action items!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
