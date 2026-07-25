# CORTEX AI API Documentation

Base URL: `http://localhost:8000`

---

## Authentication

### POST /auth/login
Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### POST /auth/register
Create a new account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### POST /auth/oauth/google
Authenticate via Google OAuth.

**Request:**
```json
{
  "id_token": "google-id-token"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### GET /auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://...",
  "role": "admin"
}
```

---

## Agents

### POST /agents/chat
Send a message to the AI Chief of Staff.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message": "Summarize my Jira tickets from this week",
  "channel": "chat",
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "msg-uuid",
  "response": "Here's a summary of your Jira tickets this week...",
  "agent": "supervisor",
  "tool_calls": [
    {"tool": "jira", "action": "query_tickets", "status": "success"}
  ],
  "created_at": "2026-01-01T00:00:00Z"
}
```

### GET /agents/status
Get status of all agents.

**Response:**
```json
{
  "agents": [
    {"name": "supervisor", "status": "active", "tasks_processed": 142},
    {"name": "research", "status": "active", "tasks_processed": 89},
    {"name": "note_taker", "status": "idle", "tasks_processed": 203}
  ]
}
```

---

## Conversations

### GET /conversations
List user conversations.

**Query params:** `?page=1&limit=20`

**Response:**
```json
{
  "items": [
    {
      "id": "conv-uuid",
      "title": "Weekly Planning",
      "last_message": "Done. I've created the report.",
      "unread_count": 0,
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### GET /conversations/{id}
Get conversation history.

**Response:**
```json
{
  "id": "conv-uuid",
  "title": "Weekly Planning",
  "messages": [
    {
      "role": "user",
      "content": "Summarize my Jira tickets",
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Here's a summary...",
      "created_at": "2026-01-01T00:00:01Z"
    }
  ]
}
```

### DELETE /conversations/{id}
Delete a conversation.

---

## Transcription

### WebSocket /ws/transcribe
Real-time audio transcription via WebSocket.

**Query params:** `?token=<jwt_token>`

**Flow:**
1. Open WebSocket connection
2. Send binary audio chunks (16kHz mono PCM)
3. Receive transcription events

**Server Events:**
```json
{
  "type": "transcript",
  "text": "Hello, this is a test",
  "is_final": false,
  "timestamp": 1.234
}
```

```json
{
  "type": "transcript_final",
  "text": "Hello, this is a test of the transcription system.",
  "timestamp": 3.456
}
```

```json
{
  "type": "summary",
  "text": "User tested the transcription system.",
  "action_items": ["Review transcription quality"]
}
```

```json
{
  "type": "error",
  "code": "AUTH_FAILED",
  "message": "Invalid or expired token"
}
```

### GET /transcriptions
List transcriptions.

**Query params:** `?page=1&limit=20&search=keyword`

**Response:**
```json
{
  "items": [
    {
      "id": "tr-uuid",
      "title": "Meeting Notes - Jan 1",
      "duration_seconds": 342,
      "word_count": 2850,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 12
}
```

### GET /transcriptions/{id}
Get transcription detail with full text and action items.

---

## Tasks

### GET /tasks
List all tasks.

**Query params:** `?status=pending&priority=high&page=1`

**Response:**
```json
{
  "items": [
    {
      "id": "task-uuid",
      "title": "Review quarterly report",
      "description": "Go through Q4 financials",
      "status": "pending",
      "priority": "high",
      "assignee": "user-uuid",
      "source": "jira",
      "due_date": "2026-02-01T00:00:00Z",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ],
  "total": 8
}
```

### PATCH /tasks/{id}
Update task status.

**Request:**
```json
{
  "status": "completed"
}
```

---

## Integrations

### POST /integrations/slack/events
Slack event webhook (receives Slack messages and interactions).

### POST /integrations/jira/webhook
Jira webhook for issue updates.

### POST /integrations/notion/webhook
Notion webhook for database changes.

### GET /integrations/status
Check status of all third-party integrations.

**Response:**
```json
{
  "slack": "connected",
  "jira": "connected",
  "notion": "disconnected",
  "google": "connected"
}
```

---

## Health

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "postgres": "up",
    "redis": "up",
    "qdrant": "up",
    "neo4j": "up"
  },
  "uptime_seconds": 12345
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE",
  "status_code": 400
}
```

| Status | Code                  | Description                |
|--------|-----------------------|----------------------------|
| 400    | VALIDATION_ERROR      | Invalid request body       |
| 401    | UNAUTHORIZED          | Missing or invalid token   |
| 403    | FORBIDDEN             | Insufficient permissions   |
| 404    | NOT_FOUND             | Resource not found         |
| 429    | RATE_LIMIT_EXCEEDED   | Too many requests          |
| 500    | INTERNAL_ERROR        | Server error               |

---

## Rate Limiting

- Authenticated: 100 requests/minute
- Unauthenticated: 20 requests/minute
- Transcription WebSocket: 5 concurrent connections per user
