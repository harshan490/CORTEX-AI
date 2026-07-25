<div align="center">

<img src="assets/cortexlogo.png" alt="CORTEX AI Logo" width="420"/>

# CORTEX AI

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![InnovaHack](https://img.shields.io/badge/InnovaHack-Chapter%201-6366f1)](https://innovahack.dev)

**The Autonomous AI Operating System for Real-World Goal Execution**

CORTEX is not a chatbot. It is an autonomous multi-agent system that accepts high-level goals from users and executes them end-to-end — planning, researching, deciding, acting, recovering from failures, and delivering structured reports — without requiring step-by-step human guidance.

---

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CORTEX AI  v0.3                             │
│              Autonomous AI Operating System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   User Goal  ──►  Intent Analyzer  ──►  Planner Agent              │
│                                              │                      │
│                                    Task Graph Generator             │
│                                              │                      │
│                               ┌──────────────▼──────────────┐      │
│                               │         SUPERVISOR           │      │
│                               └──┬──┬──┬──┬──┬──┬──┬───────┘      │
│                                  │  │  │  │  │  │  │               │
│                    Research ◄────┘  │  │  │  │  │  └──► Comms      │
│                    Memory   ◄───────┘  │  │  │  └─────► Decision   │
│                    Scheduler ◄─────────┘  │  └───────► Execution   │
│                    Reflection ◄───────────┘                         │
│                                              │                      │
│                                    Failure Recovery                 │
│                                              │                      │
│                                       Final Report                  │
│                                                                     │
├──────────────────┬──────────────────┬────────────────────────────── │
│   PostgreSQL     │     Redis        │   Qdrant        │  Neo4j      │
│   (Relational)   │  (Cache/Queue)   │   (Vector)      │  (Graph)    │
└──────────────────┴──────────────────┴─────────────────┴─────────────┘
```

---

## Why CORTEX Exists

Current AI assistants — regardless of how capable the underlying model is — are fundamentally reactive. They respond to prompts. They do not act.

Giving GPT-4 or Claude a complex goal like *"prepare my company for Series A due diligence"* produces a list of suggestions. It does not produce a completed due diligence package.

The gap is **agency**: the capacity to plan across multiple steps, select and invoke tools, monitor execution, handle partial failures, adapt the plan, and produce verifiable output — without a human guiding each step.

CORTEX closes that gap. It is built around a multi-agent execution engine where specialized agents collaborate under a supervisor, share a persistent memory system, and operate against a task graph that can be replanned dynamically when reality diverges from the plan.

The system behaves like an AI Chief of Staff: it receives intent, owns execution, and reports back with results.

---

## Key Capabilities

| Capability | Description |
|---|---|
| **Goal Understanding** | Parses high-level natural language goals into structured intent with constraints, priorities, and success criteria |
| **Task Planning** | Generates step-by-step execution plans with dependencies, estimated costs, and tool requirements |
| **Task Decomposition** | Breaks complex goals into atomic subtasks assignable to individual agents |
| **Multi-Agent Collaboration** | Specialized agents operate concurrently under supervisor coordination |
| **Dynamic Tool Selection** | Agents choose tools at runtime based on task requirements and tool availability |
| **Long-Term Memory** | Persists user context, preferences, and execution history across sessions |
| **Semantic Search** | Retrieves relevant past context using vector similarity via Qdrant |
| **Knowledge Graph** | Models entity relationships across tasks using Neo4j for cross-context reasoning |
| **Reflection** | Post-execution analysis identifies what worked, what failed, and why |
| **Failure Recovery** | Detects execution failures and replans automatically with alternative strategies |
| **Explainability** | Every agent decision is logged with reasoning, producing an auditable execution trace |
| **Real-Time Context** | WebSocket connections stream execution status live to the frontend |
| **Autonomous Execution** | Completes multi-step workflows without human intervention between steps |
| **Scalability** | Celery workers distribute agent tasks; Redis coordinates state across instances |

---

## CORTEX vs. Traditional AI

| Dimension | Traditional Chatbot | CORTEX AI |
|---|---|---|
| **Interaction model** | One question → one answer | One goal → complete execution |
| **Statefulness** | Stateless or limited session context | Persistent memory across sessions |
| **Tool use** | Some models call tools; user drives the loop | Agents autonomously select and chain tools |
| **Planning** | None; responds to the current prompt | Generates and maintains a dynamic task graph |
| **Failure handling** | Stops or hallucinates | Detects failures and replans |
| **Multi-step tasks** | Requires human orchestration | Autonomous end-to-end execution |
| **Explainability** | Black box response | Full reasoning trace per agent and step |
| **Long-term memory** | Context window only | Vector + relational + graph memory |
| **Output** | Text | Structured reports, created files, API calls, updated records |

---

## System Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                          USER INTERFACE LAYER                        ║
║                                                                      ║
║   ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐   ║
║   │  Next.js UI  │    │  REST Client │    │  WebSocket Stream    │   ║
║   └──────┬──────┘    └──────┬───────┘    └──────────┬───────────┘   ║
╚══════════╪═══════════════════╪════════════════════════╪══════════════╝
           │                   │                        │
╔══════════╪═══════════════════╪════════════════════════╪══════════════╗
║          │           API GATEWAY (FastAPI)             │             ║
║          └──────────────────┬─────────────────────────┘             ║
║                             │                                        ║
║              ┌──────────────▼──────────────┐                        ║
║              │       INTENT ANALYZER        │                        ║
║              │  (goal parsing, constraint   │                        ║
║              │   extraction, clarification) │                        ║
║              └──────────────┬──────────────┘                        ║
║                             │                                        ║
║              ┌──────────────▼──────────────┐                        ║
║              │       PLANNER AGENT          │                        ║
║              │  (task graph generation,     │                        ║
║              │   dependency resolution,     │                        ║
║              │   tool assignment)           │                        ║
║              └──────────────┬──────────────┘                        ║
║                             │                                        ║
║              ┌──────────────▼──────────────┐                        ║
║              │         SUPERVISOR           │                        ║
║              │  (orchestration, delegation, │                        ║
║              │   monitoring, coordination)  │                        ║
║  ┌───────────┴────────────────────────────────────────────────┐     ║
║  │                    AGENT LAYER                              │     ║
║  │                                                             │     ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │     ║
║  │  │ Research │ │  Memory  │ │Scheduler │ │  Execution   │  │     ║
║  │  │  Agent   │ │  Agent   │ │  Agent   │ │    Agent     │  │     ║
║  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │     ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐   │     ║
║  │  │Decision  │ │Reflection│ │    Communication Agent   │   │     ║
║  │  │  Agent   │ │  Agent   │ │  (Slack / Email / Notif) │   │     ║
║  │  └──────────┘ └──────────┘ └──────────────────────────┘   │     ║
║  └────────────────────────────┬────────────────────────────────┘     ║
║                               │                                      ║
║              ┌────────────────▼────────────────┐                    ║
║              │        FAILURE RECOVERY          │                    ║
║              │  (error classification,          │                    ║
║              │   retry logic, replanning)       │                    ║
║              └────────────────┬────────────────┘                    ║
║                               │                                      ║
║              ┌────────────────▼────────────────┐                    ║
║              │       REFLECTION AGENT           │                    ║
║              │  (post-execution analysis,       │                    ║
║              │   memory consolidation,          │                    ║
║              │   report generation)             │                    ║
║              └─────────────────────────────────┘                    ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║                         PERSISTENCE LAYER                            ║
║                                                                      ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  ║
║  │  PostgreSQL  │ │    Redis     │ │    Qdrant    │ │   Neo4j   │  ║
║  │  Relational  │ │ Cache/Queue  │ │    Vector    │ │   Graph   │  ║
║  │  task state  │ │ working mem  │ │ semantic mem │ │ entity    │  ║
║  │  user data   │ │ agent comms  │ │ embeddings   │ │ relations │  ║
║  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Agent Architecture

### Supervisor Agent

The central orchestrator. Receives the task graph from the Planner, delegates subtasks to specialized agents, monitors execution state, and handles escalations. Does not execute tasks directly — it coordinates, sequences, and arbitrates.

### Planner Agent

Transforms parsed user intent into a directed acyclic task graph (DAG). Each node in the graph is an atomic unit of work with assigned agent, required tools, inputs, expected outputs, and fallback strategies. The Planner can be invoked mid-execution if the current plan becomes invalid.

### Research Agent

Handles all information-gathering tasks. Equipped with web search, document fetching, PDF parsing, and API querying tools. Returns structured summaries with source citations. Results are stored in semantic memory for retrieval by other agents.

### Memory Agent

Manages all memory tiers — reading from and writing to working memory (Redis), semantic memory (Qdrant), relational history (PostgreSQL), and the knowledge graph (Neo4j). Handles context retrieval requests from other agents and consolidates short-term findings into long-term storage at task completion.

### Decision Agent

Evaluates options and makes structured decisions when the execution path is ambiguous. Produces decision records with reasoning, alternatives considered, and confidence scores. Decision history is stored and surfaces in the final report.

### Execution Agent

Performs direct actions: writing files, calling external APIs, submitting forms, updating records. Operates in a sandboxed environment with action logging. Reports success/failure states back to the Supervisor.

### Scheduler Agent

Manages time-based coordination: calendar lookups, deadline tracking, reminder creation, Celery task scheduling. Aware of user timezone and availability constraints.

### Communication Agent

Handles outbound communication via Slack, email, or in-app notification. Also monitors incoming channels for relevant signals (replies, approvals, status updates) that may affect active task execution.

### Reflection Agent

Activated at task completion. Analyzes the full execution trace, identifies inefficiencies and failures, updates agent performance metrics, consolidates findings into long-term memory, and produces the final structured report delivered to the user.

---

## Memory System

CORTEX operates a four-tier memory architecture. Every agent can read and write to the appropriate tier via the Memory Agent.

```
┌──────────────────────────────────────────────────────────────────┐
│                       MEMORY ARCHITECTURE                         │
│                                                                   │
│  ┌─────────────────┐                                             │
│  │  Working Memory  │  Redis (TTL-bounded)                        │
│  │                  │  Active task context, agent state,          │
│  │                  │  inter-agent message passing                │
│  └────────┬─────────┘                                             │
│           │ consolidation on task completion                      │
│  ┌────────▼─────────┐                                             │
│  │  Semantic Memory  │  Qdrant (vector embeddings)                │
│  │                   │  Research findings, past conversations,    │
│  │                   │  documents, similarity search              │
│  └────────┬──────────┘                                            │
│           │ structured extraction                                 │
│  ┌────────▼──────────┐                                            │
│  │   Long-Term Store  │  PostgreSQL                               │
│  │                    │  Execution history, user preferences,     │
│  │                    │  task records, agent decisions            │
│  └────────┬───────────┘                                           │
│           │ entity/relationship extraction                        │
│  ┌────────▼──────────┐                                            │
│  │  Knowledge Graph   │  Neo4j                                    │
│  │                    │  People, organizations, projects,         │
│  │                    │  events and their relationships           │
│  └───────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

**Context Retrieval:** When an agent needs context, it submits a retrieval request to the Memory Agent specifying query, memory tier, and relevance threshold. The Memory Agent performs hybrid retrieval — combining vector similarity (Qdrant) and graph traversal (Neo4j) — and returns a ranked context block.

---

## Autonomous Execution Pipeline

```
  USER SUBMITS GOAL
         │
         ▼
  ┌──────────────┐
  │ INTENT       │  Parse goal → extract intent, constraints, success
  │ ANALYSIS     │  criteria, time bounds, resource limits
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  PLANNING    │  Generate task DAG → assign agents → estimate
  │              │  duration → define fallback paths
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  TASK GRAPH  │  Persist graph → validate dependencies →
  │  VALIDATION  │  check tool availability
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    TOOL      │  Each agent selects tools for its assigned
  │  SELECTION   │  subtasks based on task type and tool registry
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  EXECUTION   │  Agents execute concurrently where graph
  │              │  permits; Supervisor monitors state
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  MONITORING  │  Real-time status tracking; anomaly detection;
  │              │  stall detection; partial result handling
  └──────┬───────┘
         │
    ┌────┴────┐
    │ success? │
    └────┬────┘
   no    │  yes
    ▼    └──────────────────────┐
  ┌──────────────┐              │
  │   FAILURE    │  Classify    │
  │   RECOVERY   │  error →     │
  │              │  retry /     │
  │              │  replan /    │
  │              │  escalate    │
  └──────┬───────┘              │
         │                      │
         └──────────────────────▼
                       ┌──────────────┐
                       │  REFLECTION  │  Analyze trace → update
                       │              │  memory → score performance
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ FINAL REPORT │  Structured output with
                       │              │  results, reasoning, sources,
                       │              │  and execution summary
                       └──────────────┘
```

---

## Feature Reference

| Feature | Status | Notes |
|---|---|---|
| Natural language goal input | ✅ Complete | Multi-turn clarification supported |
| Intent parsing and constraint extraction | ✅ Complete | |
| Task DAG generation | ✅ Complete | |
| Supervisor orchestration | ✅ Complete | |
| Research Agent with web search | ✅ Complete | |
| Memory Agent (all tiers) | ✅ Complete | |
| Qdrant vector memory | ✅ Complete | |
| Neo4j knowledge graph | ✅ Complete | |
| Execution Agent | ✅ Complete | |
| Failure classification and recovery | ✅ Complete | |
| Reflection Agent | ✅ Complete | |
| Execution trace / explainability log | ✅ Complete | |
| Real-time WebSocket status stream | ✅ Complete | |
| JWT authentication | ✅ Complete | |
| Docker Compose deployment | ✅ Complete | |
| Decision Agent | 🚧 In progress | |
| Scheduler Agent | 🚧 In progress | |
| Communication Agent (Slack) | 🚧 In progress | Optional integration |
| Communication Agent (Email) | 🚧 In progress | Optional integration |
| Jira integration | 🔲 Planned | Optional tool |
| Notion integration | 🔲 Planned | Optional tool |
| Google Calendar integration | 🔲 Planned | Optional tool |
| Prometheus metrics | 🔲 Planned | |
| Multi-user / team workspaces | 🔲 Planned | |
| Self-hosted LLM support | 🔲 Planned | |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS | Dashboard and chat interface |
| **Backend** | FastAPI, Python 3.12, AsyncIO | API server and agent runtime |
| **Task Queue** | Celery + Redis | Async agent task execution |
| **Primary DB** | PostgreSQL 16 (asyncpg) | Relational data, task state |
| **Cache** | Redis 7 | Working memory, pub/sub |
| **Vector Store** | Qdrant | Semantic memory, similarity search |
| **Graph DB** | Neo4j 5 | Knowledge graph, entity relations |
| **LLMs** | Claude (Anthropic), GPT-4 (OpenAI), Gemini | Agent reasoning |
| **Embeddings** | BAAI/bge-base-en-v1.5 | Semantic encoding |
| **Auth** | JWT + Google OAuth 2.0 | Identity and session management |
| **Infrastructure** | Docker, Docker Compose | Container orchestration |
| **WebSockets** | FastAPI WebSocket | Real-time execution streaming |

---

## Project Structure

```
cortex-ai/
├── backend/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── supervisor.py          # Orchestration and delegation
│   │   ├── planner.py             # Task DAG generation
│   │   ├── intent_analyzer.py     # Goal parsing and constraint extraction
│   │   ├── research.py            # Web search, document analysis
│   │   ├── memory.py              # Memory tier coordination
│   │   ├── decision.py            # Structured decision-making
│   │   ├── execution.py           # Direct action execution
│   │   ├── scheduler.py           # Time-based task management
│   │   ├── communication.py       # Slack, email, notifications
│   │   └── reflection.py          # Post-execution analysis
│   ├── api/
│   │   ├── routes/
│   │   │   ├── goals.py           # Goal submission and tracking
│   │   │   ├── tasks.py           # Task graph CRUD
│   │   │   ├── memory.py          # Memory query endpoints
│   │   │   ├── reports.py         # Execution report retrieval
│   │   │   └── auth.py            # Authentication
│   │   └── websocket.py           # Real-time execution stream
│   ├── core/
│   │   ├── config.py              # Settings and env management
│   │   ├── security.py            # JWT, OAuth
│   │   ├── dependencies.py        # FastAPI DI
│   │   └── logging.py             # Structured logging
│   ├── memory/
│   │   ├── working.py             # Redis working memory
│   │   ├── semantic.py            # Qdrant vector operations
│   │   ├── relational.py          # PostgreSQL long-term store
│   │   └── graph.py               # Neo4j knowledge graph
│   ├── models/
│   │   ├── goal.py
│   │   ├── task.py
│   │   ├── agent.py
│   │   └── user.py
│   ├── schemas/
│   │   ├── goal.py
│   │   ├── task.py
│   │   └── report.py
│   ├── services/
│   │   ├── tool_registry.py       # Available tool index
│   │   ├── llm.py                 # LLM provider abstraction
│   │   ├── embeddings.py          # Embedding generation
│   │   └── recovery.py            # Failure classification and recovery
│   ├── tools/
│   │   ├── web_search.py
│   │   ├── document_reader.py
│   │   ├── api_caller.py
│   │   ├── file_writer.py
│   │   ├── calendar.py
│   │   ├── slack.py               # Optional integration
│   │   ├── jira.py                # Optional integration
│   │   └── notion.py              # Optional integration
│   ├── alembic/                   # Database migrations
│   ├── alembic.ini
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Goal input dashboard
│   │   ├── goals/[id]/page.tsx    # Execution trace view
│   │   └── reports/[id]/page.tsx  # Final report view
│   ├── components/
│   │   ├── GoalInput.tsx
│   │   ├── TaskGraph.tsx          # DAG visualization
│   │   ├── AgentStream.tsx        # Live WebSocket feed
│   │   ├── ReportView.tsx
│   │   └── MemoryPanel.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── types.ts
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── scripts/
│   ├── setup.sh
│   ├── setup.ps1
│   └── seed_db.py
├── docs/
│   ├── architecture.md
│   ├── agents.md
│   ├── memory.md
│   └── api.md
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── README.md
```

---

## Installation

### Prerequisites

- Python 3.12+
- Node.js 22+
- Docker and Docker Compose

### Docker Setup (Recommended)

```bash
git clone https://github.com/your-org/cortex-ai.git
cd cortex-ai

cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

docker compose -f docker/docker-compose.yml up -d
```

Services started by Docker Compose:

| Service | Port | Role |
|---|---|---|
| PostgreSQL | 5432 | Primary relational store |
| Redis | 6379 | Cache, working memory, task queue |
| Qdrant | 6333 | Vector embeddings |
| Neo4j | 7474 / 7687 | Knowledge graph |
| Backend | 8000 | FastAPI application |
| Frontend | 3000 | Next.js dashboard |
| Celery Worker | — | Background agent execution |

### Local Setup

#### Linux / macOS
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Windows (PowerShell)
```powershell
.\scripts\setup.ps1
```

#### Manual

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in required values

# Run database migrations
alembic upgrade head

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
```

### Environment Variables

```env
# Core databases
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/cortex
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333

# Knowledge graph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# LLM providers (configure at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Auth
JWT_SECRET=change-this-in-production
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional integrations
SLACK_BOT_TOKEN=xoxb-...
JIRA_URL=https://your-domain.atlassian.net
NOTION_API_KEY=secret_...
```

### Running

```bash
# Terminal 1 — API server
cd backend && uvicorn main:app --reload

# Terminal 2 — Agent worker
cd backend && celery -A services.celery_app worker --loglevel=info

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## Example Use Cases

### Competitive Research

```
Goal: "Analyze the top 5 competitors to our product and produce a comparison report."

CORTEX:
  → Research Agent searches for each competitor
  → Memory Agent stores findings with entity relationships
  → Decision Agent scores each competitor on defined criteria
  → Reflection Agent produces a structured markdown comparison report
  → Execution Agent saves report to /reports/competitive_analysis.md
```

### Travel Planning

```
Goal: "Plan a 10-day trip to Japan in April for two people, budget $6,000."

CORTEX:
  → Research Agent pulls flight options, accommodation, itinerary suggestions
  → Scheduler Agent checks calendar availability
  → Decision Agent selects options within budget constraints
  → Execution Agent (optional) books or drafts booking links
  → Final report: day-by-day itinerary with cost breakdown
```

### Interview Preparation

```
Goal: "Prepare me for a senior backend engineer interview at a FAANG company next week."

CORTEX:
  → Research Agent retrieves common interview formats and question banks
  → Memory Agent recalls user's past projects and skills from profile
  → Planner generates study schedule across 7 days
  → Scheduler Agent creates calendar blocks for each topic
  → Execution Agent generates practice problem sets per topic
  → Final report: personalized study plan with resources
```

### Startup Launch Checklist

```
Goal: "Launch my SaaS product publicly by end of month."

CORTEX:
  → Planner decomposes into: legal, product, marketing, infrastructure, GTM
  → Research Agent surfaces checklist items per domain
  → Decision Agent prioritizes tasks by dependency and deadline
  → Scheduler Agent creates a day-by-day launch timeline
  → Communication Agent (optional) drafts launch announcements
  → Final report: complete launch checklist with owners and deadlines
```

---

## Example Execution Trace

```
USER INPUT
  "Research the current state of open-source LLM inference frameworks
   and produce a technical comparison report."

──────────────────────────────────────────────────────────────────────
[INTENT ANALYZER]
  intent:       technical_research
  domain:       machine_learning / llm_inference
  output_type:  comparison_report
  constraints:  open_source only, technical depth required

[PLANNER]
  Task 1: Identify leading frameworks          → Research Agent
  Task 2: Retrieve documentation per framework → Research Agent
  Task 3: Extract benchmark data               → Research Agent
  Task 4: Store findings in semantic memory    → Memory Agent
  Task 5: Score frameworks on criteria matrix  → Decision Agent
  Task 6: Generate comparison report           → Reflection Agent
  Task 7: Save report to file                  → Execution Agent

[SUPERVISOR] → Dispatching Task 1
[RESEARCH AGENT] → web_search("open source LLM inference frameworks 2024")
  → Found: vLLM, llama.cpp, TGI, Ollama, LMDeploy, MLC-LLM
[SUPERVISOR] → Tasks 2–4 dispatched concurrently

[RESEARCH AGENT] → Fetching documentation for vLLM...  ✓
[RESEARCH AGENT] → Fetching documentation for llama.cpp... ✓
[RESEARCH AGENT] → Fetching benchmark data from MLPerf... ✓
[MEMORY AGENT] → Embedding and storing 6 framework profiles... ✓

[SUPERVISOR] → Dispatching Task 5
[DECISION AGENT] → Scoring on: throughput, memory efficiency, ease of
                   deployment, hardware support, community activity
  → Scores computed. vLLM ranks highest on throughput.

[SUPERVISOR] → Dispatching Task 6
[REFLECTION AGENT] → Generating structured comparison report...
  → Report includes: framework overview, benchmark table,
    use-case recommendations, known limitations

[EXECUTION AGENT] → Writing report to /reports/llm_inference_comparison.md ✓

──────────────────────────────────────────────────────────────────────
TASK COMPLETE
  Duration:  47s
  Steps:     7 / 7 completed
  Failures:  0
  Output:    /reports/llm_inference_comparison.md
```

---

## Development Roadmap

### Phase 1 — Foundation (Complete)
- [x] FastAPI backend with async support
- [x] PostgreSQL schema and Alembic migrations
- [x] Redis integration for caching and queuing
- [x] Docker Compose environment
- [x] JWT authentication with Google OAuth
- [x] Next.js frontend with WebSocket support

### Phase 2 — Memory and Semantic Layer (Complete)
- [x] Qdrant vector store integration
- [x] Embedding pipeline (BAAI/bge-base-en-v1.5)
- [x] Neo4j knowledge graph
- [x] Memory Agent implementation
- [x] Hybrid retrieval (vector + graph)

### Phase 3 — Agent System (Active)
- [x] Supervisor Agent
- [x] Planner Agent with DAG generation
- [x] Research Agent
- [x] Reflection Agent
- [x] Failure Recovery module
- [ ] Decision Agent
- [ ] Execution Agent (file, API actions)
- [ ] Scheduler Agent

### Phase 4 — Integrations and Scale (Planned)
- [ ] Communication Agent (Slack, email)
- [ ] Optional tool integrations (Jira, Notion, Google Calendar)
- [ ] Celery-based distributed agent execution
- [ ] Prometheus metrics and Grafana dashboards
- [ ] Rate limiting and quota management
- [ ] CI/CD pipeline

### Future Vision
- [ ] Agent self-improvement via reflection history
- [ ] Cross-device goal persistence
- [ ] Team workspaces with shared agent context
- [ ] Enterprise SSO and audit logging
- [ ] Self-hosted LLM backend (Ollama, vLLM)
- [ ] Domain-specific agent packs (legal, healthcare, finance)

---

## How CORTEX Differs

**vs. ChatGPT / Claude / Gemini**
These are conversational models. They respond to the current prompt with no persistent state and no capacity to autonomously execute multi-step plans. CORTEX uses these models as reasoning engines inside a larger orchestration system that handles planning, memory, tool use, monitoring, and recovery.

**vs. Microsoft Copilot**
Copilot integrates LLMs into specific Microsoft products (Word, Teams, Excel). It augments individual tools. CORTEX is goal-oriented and product-agnostic — it coordinates across arbitrary tools to achieve a stated objective.

**vs. AutoGPT / BabyAGI**
Early autonomous agent experiments that demonstrated the concept but lacked production reliability, structured memory, failure recovery, and explainability. CORTEX is designed with those gaps addressed: typed task graphs, multi-tier memory, failure classification, and a full execution audit trail.

**vs. LangChain / LlamaIndex**
These are frameworks for building agentic applications. CORTEX is a deployed system built on top of such primitives, with a complete product layer: authentication, persistent state, real-time UI, and structured reporting.

---

## Contributing

Contributions are welcome. Please read the guidelines before submitting.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using conventional commits: `git commit -m 'feat: add decision agent scoring'`
4. Push and open a pull request against `main`

Please ensure:
- All new code includes type annotations
- Tests are provided for agent logic and API routes
- `ruff` and `mypy` pass with no errors
- Frontend changes include TypeScript types

For significant changes, open an issue first to discuss the approach.

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">
  <br/>
  <sub>CORTEX AI — InnovaHack Chapter 1 · Agentic AI Domain</sub>
</div>
