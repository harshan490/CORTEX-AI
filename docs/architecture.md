# CORTEX AI Architecture

## Overview

CORTEX AI is a multi-agent orchestration platform that serves as an autonomous AI Chief of Staff. It integrates multiple AI agents, vector memory, graph-based knowledge, and real-time transcription to automate workflows across Slack, Jira, Notion, and other enterprise tools.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Web UI  │  │  Slack   │  │   API    │  │  WebSocket (Live) │  │
│  │ (Next.js)│  │   App    │  │ Clients  │  │  Transcription    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
└───────┼──────────────┼─────────────┼──────────────────┼─────────────┘
        │              │             │                  │
┌───────┼──────────────┼─────────────┼──────────────────┼─────────────┐
│       │              │     API GATEWAY (FastAPI)      │             │
│       └──────────────┼─────────────┼──────────────────┘             │
│                      │             │                                │
│              ┌───────▼─────────────▼───────┐                        │
│              │      AUTH MIDDLEWARE        │                        │
│              │   JWT / OAuth / API Keys    │                        │
│              └───────┬─────────────────────┘                        │
│                      │                                              │
│              ┌───────▼─────────────────────┐                        │
│              │      ORCHESTRATOR LAYER      │                       │
│              │  ┌──────────────────────┐   │                        │
│              │  │   Supervisor Agent   │   │                        │
│              │  │  (Task Planning &    │   │                        │
│              │  │   Delegation)        │   │                        │
│              │  └──────────┬───────────┘   │                        │
│              │             │               │                        │
│              │  ┌──────────▼───────────┐   │                        │
│              │  │   Specialized Agents │   │                        │
│              │  │  ┌────┐┌────┐┌────┐ │   │                        │
│              │  │  │Res.││Ctx.││Sked│ │   │                        │
│              │  │  │ch  ││tual││uler│ │   │                        │
│              │  │  └────┘└────┘└────┘ │   │                        │
│              │  │  ┌────┐┌────┐┌────┐ │   │                        │
│              │  │  │Note││Slck││Jira│ │   │                        │
│              │  │  │    ││    ││    │ │   │                        │
│              │  │  └────┘└────┘└────┘ │   │                        │
│              │  └─────────────────────┘   │                        │
│              └───────┬─────────────────────┘                        │
│                      │                                              │
│              ┌───────▼─────────────────────┐                        │
│              │      MEMORY & STORAGE        │                       │
│              │  ┌────────┐ ┌────────┐      │                       │
│              │  │Postgres│ │ Redis  │      │                       │
│              │  │(Relat.)│ │(Cache) │      │                       │
│              │  └────────┘ └────────┘      │                       │
│              │  ┌────────┐ ┌────────┐      │                       │
│              │  │ Qdrant │ │ Neo4j  │      │                       │
│              │  │(Vector)│ │(Graph) │      │                       │
│              │  └────────┘ └────────┘      │                       │
│              └──────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### Frontend (Next.js)
- **Role**: User interface for interacting with the AI Chief of Staff
- **Features**: Dashboard, conversation UI, task management, live transcription viewer, analytics
- **Communication**: REST API + WebSocket for real-time updates

### Backend (FastAPI)
- **Role**: API gateway and orchestration layer
- **Features**: REST endpoints, WebSocket management, authentication, agent coordination
- **Async**: Built on asyncpg, httpx, and websockets for non-blocking I/O

### Supervisor Agent
- **Role**: Central orchestrator that plans and delegates tasks
- **Behavior**: Receives user requests, breaks them into sub-tasks, assigns to specialized agents, synthesizes results
- **Memory**: Uses both vector (Qdrant) for semantic recall and graph (Neo4j) for relational context

### Specialized Agents

| Agent     | Responsibility                                          | Tools                |
|-----------|---------------------------------------------------------|----------------------|
| Research  | Web search, document analysis, information synthesis    | WebFetch, SerpAPI    |
| Contextual| Conversation context, user preferences, memory recall   | Qdrant, Neo4j        |
| Scheduler | Calendar management, meeting scheduling, reminders      | Celery, Redis        |
| Note Taker| Real-time transcription, summarization, action items    | Whisper, LLM         |
| Slack     | Channel monitoring, message sending, thread management  | Slack SDK            |
| Jira      | Issue creation, status tracking, sprint management      | Jira API             |

### Celery Workers
- **Role**: Background task processing for long-running operations
- **Use cases**: Email processing, document indexing, scheduled reports, batch transcription

### Memory Stack

| Store    | Purpose                              | Data                        |
|----------|--------------------------------------|-----------------------------|
| Postgres | Relational data, user accounts, tasks | Users, sessions, logs       |
| Redis    | Caching, Celery broker, rate limits  | Session data, job queue     |
| Qdrant   | Vector embeddings for semantic search| Document chunks, memories   |
| Neo4j    | Knowledge graph for relationships    | Entity connections, context |

---

## Data Flow

### User Request Flow

```
User Message → API Gateway → Auth Middleware → Supervisor Agent
                                                      │
                                           ┌──────────┼──────────┐
                                           ▼          ▼          ▼
                                     Research    Contextual   Scheduler
                                     Agent        Agent        Agent
                                           │          │          │
                                           └──────────┼──────────┘
                                                      ▼
                                              Response Synthesis
                                                      │
                                                      ▼
                                                 User Response
```

### Real-Time Transcription Flow

```
Audio Stream → WebSocket → Note Taker Agent → Whisper (STT)
                                                    │
                                           ┌────────┼────────┐
                                           ▼        ▼        ▼
                                     Transcript  Summary  Action Items
                                           │        │        │
                                           ▼        ▼        ▼
                                       Postgres  Qdrant   Notion/Slack
```

---

## Agent Interaction Patterns

### 1. Sequential Delegation
Supervisor calls agents one after another when tasks have dependencies.

```
Supervisor → Research Agent (gather data)
                  ↓ results
           → Contextual Agent (enrich with history)
                  ↓ results
           → Response (synthesize)
```

### 2. Parallel Fan-Out
Supervisor dispatches to multiple agents simultaneously for independent sub-tasks.

```
Supervisor → Research Agent ─┐
          → Slack Agent    ──┤→ Aggregate → Response
          → Jira Agent     ──┘
```

### 3. Chain-of-Thought Planning
Supervisor generates a step-by-step plan before execution.

```
Request: "Prepare weekly report"
Plan: 1. Query Jira for completed tasks
     2. Search web for industry news
     3. Compile into report format
     4. Post to Slack channel
```

### 4. Memory-Augmented Retrieval
Agents enrich queries with context from both vector and graph stores.

```
Query → Embed → Qdrant (semantic similar)
     → Entity extract → Neo4j (related entities)
     → Concatenate context → LLM → Response
```
