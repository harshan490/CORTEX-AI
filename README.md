# 🧠 CORTEX AI

> **The Autonomous AI Chief of Staff**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Postgres](https://img.shields.io/badge/Postgres-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🚀 Elevator Pitch

**CORTEX AI is your autonomous Chief of Staff.** It listens to meetings, summarizes discussions, tracks action items across Jira and Notion, manages your calendar, researches topics, and coordinates workflows — all through natural conversation. Think of it as an AI-powered executive assistant that integrates with your entire tool stack.

---

## ✨ Features

| Area | Capabilities |
|------|-------------|
| 🎤 **Live Transcription** | Real-time speech-to-text via WebSocket, automatic summarization, action item extraction |
| 🧠 **Multi-Agent System** | Specialized agents (Research, Scheduler, Notes, Slack, Jira) coordinated by a Supervisor |
| 📚 **Semantic Memory** | Vector embeddings stored in Qdrant for long-term recall and contextual awareness |
| 🕸️ **Knowledge Graph** | Neo4j-powered entity relationships for cross-context reasoning |
| 🔌 **Enterprise Integrations** | Slack, Jira, Notion, Google Calendar, and more |
| ⏰ **Background Jobs** | Celery workers for async tasks — email reports, batch processing, scheduled actions |
| 🔐 **Auth** | JWT-based auth with Google OAuth support |
| 📊 **Dashboard** | Next.js UI with real-time updates via WebSocket |
| 🐳 **Docker-First** | One-command deployment with Docker Compose |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CLIENT LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Web UI  │  │  Slack   │  │  WebSocket (STT) │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼──────────────┼──────────────────┼─────────────┘
        │              │                  │
┌───────┼──────────────┼──────────────────┼─────────────┐
│       │     API GATEWAY (FastAPI)       │             │
│       └──────────────┼──────────────────┘             │
│                      │                                │
│              ┌───────▼──────────┐                     │
│              │   SUPERVISOR     │                     │
│              │     AGENT        │                     │
│              └───┬───┬───┬───┬──┘                     │
│         ┌────────┤   │   │   ├────────┐               │
│         ▼        ▼   ▼   ▼   ▼        ▼               │
│      Research  Ctx  Sch  Note Slack  Jira             │
│                                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │Postgres│ │ Redis  │ │ Qdrant │ │ Neo4j  │         │
│  │(Relat) │ │(Cache) │ │(Vector)│ │(Graph) │         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
└───────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Component          | Technology                        |
|--------------------|-----------------------------------|
| **Frontend**       | Next.js 15, TypeScript, Tailwind  |
| **Backend**        | FastAPI, Python 3.12, AsyncIO     |
| **Database**       | PostgreSQL 16 (asyncpg)           |
| **Cache & Queue**  | Redis 7 + Celery                  |
| **Vector Store**   | Qdrant                            |
| **Knowledge Graph**| Neo4j 5                           |
| **STT**            | Whisper (OpenAI / local)          |
| **LLM**            | GPT-4 / Claude / local models     |
| **Auth**           | JWT + Google OAuth                |
| **Container**      | Docker + Docker Compose           |

---

## 🧑‍💻 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- Docker & Docker Compose (optional but recommended)
- PostgreSQL 16 / Redis / Qdrant / Neo4j (or use Docker)

### 🐳 Docker Setup (Recommended)

```bash
# Clone and enter the project
git clone https://github.com/your-org/cortex-ai.git
cd cortex-ai

# Start all services
docker compose -f docker/docker-compose.yml up -d

# Check logs
docker compose -f docker/docker-compose.yml logs -f
```

That's it. Docker Compose handles:

| Service     | Port | Purpose             |
|-------------|------|---------------------|
| Postgres    | 5432 | Primary database    |
| Redis       | 6379 | Cache + job queue   |
| Qdrant      | 6333 | Vector embeddings   |
| Neo4j       | 7474 | Knowledge graph     |
| Backend     | 8000 | FastAPI API         |
| Frontend    | 3000 | Next.js UI          |

### Local Setup

#### Windows (PowerShell)

```powershell
.\scripts\setup.ps1
```

#### Linux / macOS

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Manual Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
```

### Running

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev

# Terminal 3 — Celery (optional)
cd backend
celery -A scheduler.celery_app worker --loglevel=info
```

Open **http://localhost:3000** 🎉

---

## 📁 Project Structure

```
cortex-ai/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── alembic.ini           # Alembic config
│   ├── agents/               # AI agent implementations
│   │   ├── supervisor.py     # Orchestrator agent
│   │   ├── research.py       # Web research agent
│   │   ├── contextual.py     # Memory/context agent
│   │   ├── scheduler.py      # Calendar & scheduling
│   │   ├── note_taker.py     # Transcription agent
│   │   ├── slack_bot.py      # Slack integration agent
│   │   └── jira_bot.py       # Jira integration agent
│   ├── api/                  # FastAPI routes
│   ├── core/                 # Config, security, deps
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic
│   ├── main.py               # App entry point
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities, API client
│   ├── public/               # Static assets
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── scripts/
│   ├── setup.ps1             # Windows setup
│   └── setup.sh              # Unix setup
├── docs/
│   ├── architecture.md       # System design
│   └── api.md                # API reference
└── README.md
```

---

## 🧠 Agent System Overview

CORTEX uses a **Supervisor + Specialized Agents** architecture:

### Supervisor Agent
The central orchestrator. It receives user requests, plans the approach, delegates sub-tasks to specialized agents, and synthesizes the final response.

### Specialized Agents

| Agent | Role | Tools |
|-------|------|-------|
| **Research** | Web search, document analysis | WebFetch, SerpAPI, PDF parser |
| **Contextual** | Recall past conversations, user preferences | Qdrant, Neo4j |
| **Scheduler** | Calendar management, reminders | Celery Beat, Google Calendar API |
| **Note Taker** | Real-time transcription, summaries | Whisper, LLM |
| **Slack** | Channel monitoring, message dispatch | Slack SDK |
| **Jira** | Issue tracking, sprint management | Jira REST API |

### Memory Architecture

```
Short-term (Redis TTL) → Medium-term (Postgres) → Long-term (Qdrant)
                                                      ↓
                                            Knowledge Graph (Neo4j)
```

---

## 🗺️ Development Roadmap

### v0.1 — MVP
- [x] FastAPI backend with WebSocket support
- [x] Next.js frontend with chat UI
- [x] Postgres + Redis + Docker setup
- [x] JWT authentication

### v0.2 — Memory & Transcription
- [x] Qdrant vector store integration
- [x] Whisper real-time transcription
- [ ] Note summarization
- [ ] Action item extraction

### v0.3 — Agent System
- [ ] Supervisor agent orchestration
- [ ] Research agent (web search)
- [ ] Contextual memory agent
- [ ] Multi-turn conversation with recall

### v0.4 — Integrations
- [ ] Slack bot integration
- [ ] Jira issue management
- [ ] Notion database sync
- [ ] Google Calendar scheduling

### v0.5 — Production
- [ ] Celery background workers
- [ ] Neo4j knowledge graph
- [ ] Rate limiting & caching
- [ ] Prometheus monitoring
- [ ] CI/CD pipeline

---

## 🎬 Demo Scenario

> **User**: "What happened in my meetings yesterday?"
>
> **CORTEX**: Searches transcribed meetings → Queries vector memory → Summarizes key discussions and action items
>
> **User**: "Create Jira tickets for those action items and post the summary in #team-updates"
>
> **CORTEX**: Creates tickets in Jira → Posts formatted summary to Slack → Confirms completion
>
> **User**: "Schedule a follow-up for next Tuesday at 10 AM"
>
> **CORTEX**: Checks calendar availability → Creates calendar event → Sends invites → Confirms

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes linting and type checks.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by the CORTEX AI Team</sub>
</div>
