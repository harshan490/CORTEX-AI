# Cortex AI — Hackathon Presentation Speaker Notes

**Total Duration:** 8–10 minutes (15 slides)
**Audience:** Hackathon judges, technical reviewers, potential users

---

## Slide 1 — Title

**Duration:** ~30 seconds

**Script:**

Good morning/afternoon. We're presenting Cortex AI — a privacy-focused meeting intelligence platform.

The core idea is simple: meetings generate decisions, tasks, risks, and dependencies — but most of that knowledge gets buried in transcripts and never acted upon.

Cortex AI changes that. It takes raw meeting transcripts, processes them with a local AI model, and converts them into structured, actionable knowledge — with workflow tracking, human review, and analytics.

**Transition:** "First, let's talk about why this matters."

---

## Slide 2 — The Problem

**Duration:** ~45 seconds

**Script:**

Every organization runs meetings. And every meeting generates decisions, action items, risks, and dependencies.

But here's what actually happens:

Decisions get buried in transcript text. Action items are discussed but never tracked. Deadlines and dependencies are forgotten within days.

Teams spend hours manually re-reading transcripts to extract what was agreed upon. And increasingly, organizations are uncomfortable sending sensitive meeting content to cloud AI services.

The result? Meetings happen, but execution doesn't follow. There's no visibility into whether commitments were kept.

**Transition:** "Cortex AI solves this end-to-end."

---

## Slide 3 — Our Solution

**Duration:** ~45 seconds

**Script:**

Cortex AI provides an end-to-end pipeline from raw transcript to accountable execution.

Here's the flow: you input a meeting transcript. Our local AI — powered by Ollama and qwen3 — performs structured intelligence extraction. The output isn't just a summary. It's structured knowledge: participants, decisions, action items with owners, risks, dependencies, and open clarifications.

That structured output then enters a human review stage. Nothing is auto-completed — a human approves the extracted intelligence before it becomes part of the organization's record.

Finally, everything feeds into workflow tracking and analytics dashboards, creating persistent organizational memory around meetings.

Four key differentiators: privacy-first local inference, extraction that goes beyond summarization, human-in-the-loop approval, and full execution tracking.

**Transition:** "Let me walk you through the product."

---

## Slide 4 — Product Walkthrough

**Duration:** ~60 seconds

**Script:**

Let me walk through the user journey.

Step 1: The user creates a meeting — providing a title and date.

Step 2: They paste the raw meeting transcript as text segments — each line with a speaker name and their statement.

Step 3: They click Process. The backend sends the transcript to a local Ollama instance running qwen3:4b-instruct. The AI performs a single structured JSON extraction call.

Step 4: The results come back as structured intelligence — summary, participants, action items with owners, decisions, risks, dependencies, and open clarifications. The user reviews each category.

Step 5: The meeting enters an "awaiting review" workflow state at 95% progress. The user can approve or reject.

Step 6: Everything feeds into analytics dashboards with week, month, and quarter filters, searchable history, and organizational memory.

**Demo Cue:** If doing a live demo, this is where you switch to the browser.

**Transition:** "Let me show you exactly what Cortex extracts."

---

## Slide 5 — What Cortex Extracts

**Duration:** ~45 seconds

**Script:**

Cortex doesn't just summarize. It performs structured extraction across eight categories.

Summary with a confidence score. Participants extracted from speaker labels. Action items with owners, deadlines, priority levels, and the evidence from the transcript that supports each item.

Decisions with who made them. Risks with severity and likelihood. Dependencies showing what blocks what. And clarifications — questions that were raised but not resolved in the meeting.

Every extracted item includes a confidence score from 0.0 to 1.0, so reviewers know how certain the AI is about each extraction.

Here's a real example from a Project Atlas launch meeting — you can see the action item assigned to Ravi, the conditional launch decision by Asha, a high-severity security risk, and a deployment dependency.

**Transition:** "Let me show you how the processing pipeline works."

---

## Slide 6 — Workflow Pipeline

**Duration:** ~60 seconds

**Script:**

Every meeting processing request creates a persistent WorkflowState record in PostgreSQL.

The pipeline progresses through well-defined stages: transcript received at 5%, validation at 10%, provider health check at 20% — this verifies Ollama is running and the model is available.

Then intelligence extraction at 30% — this is a single structured LLM call that extracts all categories at once. Result validation at 70% checks the JSON output against our Pydantic schema.

Database persistence at 80% writes everything to PostgreSQL — idempotently, deleting any previous extraction for that meeting first.

At 95%, the workflow enters "awaiting_review" — this is the human approval boundary. Nothing reaches "completed" without explicit human approval.

Three important engineering details: the workflow has exactly four status values — processing, awaiting_review, completed, and failed. There's a UniqueConstraint on meeting_id to prevent duplicate workflows. And on failure, the error is preserved, the attempt counter increments, and the system is ready for retry.

**Transition:** "Now let's talk about privacy."

---

## Slide 7 — Privacy-First Local AI

**Duration:** ~45 seconds

**Script:**

Privacy is a first-class concern. The entire AI processing pipeline runs locally.

We use Ollama with the qwen3:4b-instruct model. The meeting transcript goes into the local Ollama runtime, comes out as structured JSON, and gets persisted to your own PostgreSQL database. No data leaves your infrastructure.

Key technical details: we dereference JSON schemas — inlining all $defs and $ref — because Ollama compiles schemas into grammars, and nested references cause severe performance degradation.

We have provider health checks that verify Ollama is running and the model is loaded before attempting extraction. The system prompt explicitly instructs the model to treat transcript content as data only, not as instructions — a defense against prompt injection.

The provider system is abstracted: you can switch between mock, ollama, and openai via a single environment variable.

One honest note: local CPU inference currently takes one to three minutes per transcript. This varies with hardware. For production use, a GPU is recommended.

**Transition:** "Let me show you the full system architecture."

---

## Slide 8 — System Architecture

**Duration:** ~45 seconds

**Script:**

Here's the full architecture. The frontend is Next.js 15 with React 19, using TypeScript, Tailwind CSS, Zustand for state management, and React Query for API state.

The backend is FastAPI with Python 3.12, using SQLAlchemy ORM, Pydantic for validation, JWT authentication, a workflow tracker, and the LLM service abstraction.

PostgreSQL is the primary data store — it holds users, meetings, tasks, decisions, risks, workflows, dependencies, and clarifications.

On the left, Ollama runs as a separate local service providing the AI inference. The backend communicates with it via HTTP.

On the right, we have provisioned infrastructure: Redis as the Celery task broker, Qdrant for future vector search, and Neo4j for future knowledge graph capabilities. These are scaffolded and ready for integration but are not part of the core processing flow today.

**Transition:** "Let me trace the actual API flow."

---

## Slide 9 — Data and API Flow

**Duration:** ~45 seconds

**Script:**

Here's the complete API sequence for processing a meeting.

Step 1: The user authenticates via POST to /api/auth/login and receives a JWT token.

Step 2: They create a meeting via POST to /api/meetings.

Step 3: They upload the transcript — this is a JSON body with speaker segments, sent to the transcript endpoint.

Step 4: They trigger processing via POST to /api/meetings/{id}/process. This creates a WorkflowState and starts the pipeline.

Steps 5 and 6: The backend runs through validation stages, checks Ollama health, then sends the transcript for structured extraction using a dereferenced JSON schema.

Step 7: Extracted data is persisted — participants, action items, decisions, risks, dependencies, and clarifications all go into PostgreSQL.

Step 8: The meeting enters awaiting_review at 95%. The frontend can poll for status updates.

Step 9: A reviewer approves with PUT status=completed or rejects with status=scheduled.

Step 10: Analytics are available via /api/analytics/overview with week, month, and quarter period filters, scoped to the authenticated user.

**Transition:** "Let's look at the analytics and history capabilities."

---

## Slide 10 — Analytics, History and Search

**Duration:** ~45 seconds

**Script:**

Cortex creates persistent organizational memory around meetings.

The Analytics Dashboard provides user-scoped metrics with three period filters — week, month, and quarter. You can see total meetings, tasks, action items, completion rates, overdue items, critical risks, average duration, and meeting trends over time.

Meeting History shows every processed meeting with its status, participant count, decision and action item counts, confidence scores, and approval outcomes. You can see the workflow state of each meeting.

Search provides full-text search across all entities — meetings, decisions, tasks, and action items. Results are scored by relevance, filterable by type and date range, and paginated.

All of these are backed by real database queries — not mock data. The analytics endpoint runs SQL aggregations scoped to the authenticated user.

**Transition:** "Let's talk about engineering quality."

---

## Slide 11 — Reliability and Engineering Quality

**Duration:** ~45 seconds

**Script:**

Engineering quality matters in a hackathon. Here's what we've built.

Authentication: JWT-based with bcrypt password hashing. All data is scoped to the authenticated user.

Test coverage: 71 backend test functions and 96 frontend test cases across 13 test files. Backend tests use ASGI transport with transactional rollback — no database pollution between tests.

The LLM provider has a deterministic mock mode for automated testing. Real Ollama integration tests are opt-in via an environment variable.

Type safety is end-to-end: TypeScript strict mode on the frontend, Pydantic schema validation on the backend. The production build has zero TypeScript errors, zero lint warnings, and zero build errors.

Processing is idempotent — the workflow uses a UniqueConstraint on meeting_id, and re-processing deletes previous extractions before writing new ones.

Errors are handled safely — OllamaError produces user-facing messages without leaking internal details. Every failure is persisted to the database with the error message and attempt count.

**Transition:** "Let me share some of the key challenges we solved."

---

## Slide 12 — Key Technical Challenges

**Duration:** ~60 seconds

**Script:**

Let me walk through five real challenges we solved.

First: slow local CPU inference. The qwen3 model on CPU can take one to three minutes. We handle this with a long configurable timeout, persistent workflow progress tracking so users can see what's happening, and duplicate-submission prevention via the workflow upsert.

Second: getting reliable structured output from a local LLM. We use JSON schema prompting with Ollama's format parameter, but we had to dereference all $defs and $ref entries — Ollama compiles schemas into grammars, and nested references caused extreme slowdowns. Every response is validated against our Pydantic schema.

Third: workflow visibility. We built a persistent WorkflowState model with 14 defined stages, each with a progress percentage. This gives users and developers full visibility into where processing is and what happened if it fails.

Fourth: test isolation. Live LLM tests are inherently slow and flaky. We use ASGI transport for fast in-process backend testing, a deterministic mock provider, transactional rollback to prevent test pollution, and opt-in real Ollama tests via an environment variable.

Fifth: database evolution. We use idempotent startup migrations that add columns and tables without dropping data — safe for development iteration.

**Transition:** "What makes Cortex AI different?"

---

## Slide 13 — Innovation and Differentiation

**Duration:** ~30 seconds

**Script:**

What makes Cortex AI different?

It's local-first — transcripts stay on your infrastructure. It goes beyond summarization — extracting eight categories of structured knowledge. It converts conversation into execution — with accountable owners and deadlines.

The human approval gate ensures nothing is auto-completed. Every processing stage is tracked persistently. And the LLM provider is swappable with a single environment variable.

This isn't just a meeting summarizer. It's a meeting intelligence and execution tracking platform.

**Transition:** "Here's our roadmap."

---

## Slide 14 — Roadmap

**Duration:** ~30 seconds

**Script:**

Three phases of future work.

Near term: background processing using the Celery infrastructure we've already scaffolded, live progress updates via WebSocket or SSE, retry and cancel controls in the UI, and meeting report exports.

Mid term: ingestion from Google Meet, Zoom, and Teams. Integrations with Slack, Jira, and Notion. Semantic vector search using the Qdrant instance we've provisioned.

Long term: an organizational knowledge graph in Neo4j for cross-meeting dependency tracking, team participation analytics, and policy compliance workflows.

All of these build on infrastructure we've already provisioned but haven't fully integrated yet.

**Transition:** "Let me wrap up."

---

## Slide 15 — Closing / Demo

**Duration:** ~30 seconds (+ demo time if available)

**Script:**

Cortex AI ensures meetings do not end as transcripts — they become decisions, owners, and measurable execution.

If time permits, I'd like to do a quick live demo: log in, create a meeting, paste a sample transcript, process it with the local AI, review the extracted intelligence, check the workflow status, explore the analytics, and verify settings persistence.

Thank you for your time. The repository is open on GitHub. We'd be happy to take questions.

---

## Demo Script

**Total Demo Duration:** ~3–4 minutes (if time permits after slides)

### Sample Transcript for Demo

```
Asha: Project Atlas is planned for launch on August 12, 2026.

Ravi: I will complete the final load test by August 9.

Meera: The security audit found a high-priority authentication issue.

Ravi: I will fix the authentication issue by August 8.

Meera: I will verify the patch and finish the security audit by August 10.

Karan: Production deployment cannot begin until both the load test and security audit are approved.

Asha: We will keep August 12 as the target, but launch is conditional on security and performance approval.
```

### Demo Steps

| Step | Action | What to Show |
|------|--------|-------------|
| 1 | **Log in** | Navigate to /auth, enter credentials, show successful login |
| 2 | **Create a meeting** | Click "New Meeting", enter title "Project Atlas Launch Planning", set date |
| 3 | **Paste transcript** | Paste the sample transcript above into the transcript input area |
| 4 | **Process with AI** | Click Process, note that processing has started |
| 5 | **Show structured output** | Once complete, show the extracted summary, participants (Asha, Ravi, Meera, Karan), action items, decisions, risks, and dependencies |
| 6 | **Open Workflows** | Navigate to Workflows page, show the WorkflowState at "awaiting_review" with 95% progress |
| 7 | **Show Analytics** | Navigate to Analytics, toggle between Week/Month/Quarter period filters |
| 8 | **Show History** | Navigate to History page, show the processed meeting in the list |
| 9 | **Show Search** | Search for "security audit" and show matching results |
| 10 | **Show Profile settings** | Navigate to Settings, update a field, verify it persists after page refresh |

### Expected Extraction Results (from sample transcript)

- **Participants:** Asha, Ravi, Meera, Karan
- **Action Items:**
  - Ravi: Complete load test by August 9
  - Ravi: Fix authentication issue by August 8
  - Meera: Verify patch and finish security audit by August 10
- **Decisions:**
  - Launch date August 12, conditional on security and performance approval (Asha)
- **Risks:**
  - High-priority authentication vulnerability (Meera)
- **Dependencies:**
  - Production deployment blocked by load test and security audit (Karan)

### Demo Tips

- If using the mock LLM provider, processing will complete in under a second
- If using Ollama with CPU, processing takes 1–3 minutes — have a pre-processed meeting ready as backup
- Ensure the backend and PostgreSQL are running before starting the demo
- Test the full flow once before the presentation to verify connectivity

---

## Timing Summary

| Slide | Title | Duration |
|-------|-------|----------|
| 1 | Title | ~30s |
| 2 | The Problem | ~45s |
| 3 | Our Solution | ~45s |
| 4 | Product Walkthrough | ~60s |
| 5 | What Cortex Extracts | ~45s |
| 6 | Workflow Pipeline | ~60s |
| 7 | Privacy-First Local AI | ~45s |
| 8 | System Architecture | ~45s |
| 9 | Data and API Flow | ~45s |
| 10 | Analytics, History and Search | ~45s |
| 11 | Reliability and Engineering Quality | ~45s |
| 12 | Key Technical Challenges | ~60s |
| 13 | Innovation and Differentiation | ~30s |
| 14 | Roadmap | ~30s |
| 15 | Closing / Demo | ~30s |
| — | **Total slides** | **~9 min 15s** |
| — | Live demo (optional) | +3–4 min |
