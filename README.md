# Donna — Workplace Intelligence Backend

A Node.js backend that transforms workplace communications into executive-grade insights. Donna ingests messages and Gmail, embeds raw emails into a vector database, and uses retrieval-augmented generation (RAG) to produce historically-grounded analysis: summaries, ranked risks, action items, and relationship connections — all explained with source context.

---

## How It Works

```
Gmail / User Messages
        ↓
  Raw email text extracted
        ↓
  Embeddings generated (Gemini gemini-embedding-001, 768-dim)
        ↓
  Stored in Supabase pgvector
        ↓
  New analysis → similarity search retrieves past relevant emails
        ↓
  Retrieved context + new messages → Gemini generation
        ↓
  Insights: summary, risks (severity-ranked), action items, connections
        ↓
  Persisted to Supabase + served to dashboard
```

The RAG loop is what makes Donna different from a simple summarizer. Because raw emails — not just previous summaries — are embedded and retrieved, every new analysis is grounded in actual historical communication patterns. Risks are ranked HIGH / MEDIUM / LOW with a reason field explaining *why*, traceable back to the source messages.

---

## Features

- **RAG-powered analysis** — retrieves semantically similar past emails before generating insights, enabling cross-session comparison and trend detection
- **pgvector embeddings** — raw Gmail messages embedded at ingestion time using Gemini's `gemini-embedding-001` model; stored natively in Supabase via the pgvector extension
- **Gmail OAuth integration** — read-only Gmail access via Google OAuth 2.0; tokens persisted to Supabase
- **Severity-ranked insights** — risks, action items, and historical context ranked by severity (HIGH / MEDIUM / LOW) with explanations
- **Executive dashboard** — frontend visualizes insights, risk trends, and connections across sessions
- **Supabase-native stack** — single database for messages, embeddings, tokens, and insights; no separate vector DB infrastructure needed

---

## Quick Start

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000` by default (configure via `PORT`).

---

## Environment Variables

Create a `.env` file — never commit it.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default 3000) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_API` | Yes | Supabase service key |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GEMINI_API_KEY` | Yes | Google Generative AI API key |

---

## Database Schema

Create these tables in Supabase. Enable the `pgvector` extension first:

```sql
create extension if not exists vector;
```

### `gmail_tokens`
Stores OAuth tokens for connected Gmail accounts.

| Column | Type |
|---|---|
| `access_token` | text |
| `refresh_token` | text |
| `scope` | text |
| `token_type` | text |
| `expiry_date` | bigint |

### `messages`
Raw messages ingested from Gmail or user input.

| Column | Type |
|---|---|
| `id` | uuid (pk) |
| `source` | text — `user` or `gmail` |
| `content` | text |
| `embedding` | vector(768) |
| `created_at` | timestamptz |

The `embedding` column stores the 768-dimensional vector produced by `gemini-embedding-001`. Used for similarity search during RAG retrieval.

```sql
-- Index for fast similarity search
create index on messages using ivfflat (embedding vector_cosine_ops);
```

### `insights`
AI-generated analysis results.

| Column | Type |
|---|---|
| `id` | uuid (pk) |
| `summary` | text |
| `risks` | jsonb |
| `action_items` | jsonb |
| `connections` | jsonb |
| `created_at` | timestamptz |

---

## HTTP API

Base URL (local): `http://localhost:3000`  
Default header: `Content-Type: application/json`

### `POST /analyze`

Persist provided messages, embed them, run RAG-augmented Gemini analysis, return insights.

**Request:**
```json
{
  "messages": ["Please review Q2 projections", "Need ETA by Friday"]
}
```

**Response (200):**
```json
{
  "summary": "Two-sentence executive summary.",
  "risks": [
    { "title": "Deadline pressure on Q2 review", "severity": "HIGH", "reason": "Repeated urgency signals across this and prior sessions" }
  ],
  "action_items": ["Confirm Q2 review owner by EOD"],
  "connections": ["Finance team", "Alice (sender)"]
}
```

**Errors:** `400` invalid body — `500` analysis failed.

---

### `GET /gmail/messages`

Return recent Gmail messages from the connected account.

**Response:**
```json
[
  { "id": "...", "subject": "Q2 Review", "from": "Alice <alice@example.com>", "snippet": "..." }
]
```

**Errors:** `401/403` if tokens missing or invalid — show "Connect Gmail" prompt in frontend.

---

### `POST /gmail/analyze`

Fetch recent Gmail messages, embed and persist them, run RAG analysis, return insights. Same response shape as `POST /analyze`. No request body required.

---

## Gmail OAuth Flow

### Backend routes

| Route | Description |
|---|---|
| `GET /auth/google` | Redirects to Google consent screen |
| `GET /auth/google/callback` | Exchanges code for tokens, persists to Supabase |

### Frontend integration

```javascript
// Open consent screen in a popup
const popup = window.open('/auth/google', 'connectGmail', 'width=600,height=700');

// Listen for completion message
window.addEventListener('message', (ev) => {
  if (ev.data?.status === 'connected') {
    // refresh UI, fetch /gmail/messages
  }
});

// Fallback: poll until popup closes
const poll = setInterval(() => {
  if (popup.closed) {
    clearInterval(poll);
    fetch('/gmail/messages').then(r => r.json()).then(updateUI);
  }
}, 500);
```

---

## RAG Implementation Notes

Embeddings are generated at ingestion time for every raw email using `src/services/embedding.js` (`generateEmbedding(text)` → 768-dim vector via `gemini-embedding-001`). At analysis time, the incoming messages are embedded and a cosine similarity search over `messages.embedding` retrieves the most relevant historical emails. These are prepended to the Gemini generation prompt as context, enabling the model to reference patterns across sessions — not just the current batch.

---

## Known Limitations & Roadmap

- **Multi-user support** — `gmail_tokens`, `messages`, and `insights` have no user identifier. Add a `user_id` column to support multiple accounts.
- **Token refresh persistence** — `googleapis` refreshes credentials in memory but does not write updated tokens back to Supabase. Implement a token refresh callback.
- **Input validation** — controllers currently do minimal validation. Add sanitization before production use.
- **Gemini JSON reliability** — the backend strips markdown fences and calls `JSON.parse` on model output. Add retry logic for malformed responses.
- **Tests** — no unit tests yet. Priority: mock Gemini and Supabase clients.

---

## Security

- Never expose `SUPABASE_API`, `GEMINI_API_KEY`, or `GOOGLE_CLIENT_SECRET` to the frontend.
- Use HTTPS in production.
- Configure CORS in `src/index.js` to restrict allowed origins.

---

## Troubleshooting

**OAuth fails immediately** — verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and that `http://localhost:3000/auth/google/callback` is listed as an authorized redirect URI in your Google Cloud Console.

**Gemini calls fail** — verify `GEMINI_API_KEY` and outbound network access.

**Supabase writes fail** — verify `SUPABASE_URL` and `SUPABASE_API`, and confirm the pgvector extension is enabled and tables exist with the correct schema.

**Similarity search slow** — ensure the IVFFlat index on `messages.embedding` exists. Run `ANALYZE messages;` after bulk inserts.