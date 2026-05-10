# Donna-Backend

A Node.js backend that ingests workplace communications (user-provided messages and Gmail), runs executive-style analysis using Google Gemini (generative + embeddings), and persists raw messages, Gmail OAuth tokens, and AI-generated insights to a Supabase database.

This README explains how to run the project, required environment variables, the database tables the code expects, and the HTTP API a frontend developer can use to integrate with the service.

## Features

- Accept user messages for analysis and persist raw messages.
- Connect to Gmail via OAuth (read-only) and fetch messages for analysis.
- Use Google Gemini models for content generation and embeddings.
- Persist insights (summary, risks, action items, connections) to Supabase.

## Quick start (development)

1. Install dependencies

```cmd
npm install
```

2. Start in development mode (uses `nodemon` if configured)

```cmd
npm run dev
```

By default the app listens on the port configured in `PORT` environment variable (check `src/index.js`). Local base URL: `http://localhost:3000`.

## Required environment variables

Set these in a `.env` file or your environment before running the server.

- `PORT` (optional) — server port
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_API` — Supabase service key or anon key used by the server
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `GEMINI_API_KEY` — API key for Google Generative AI client

Keep keys secret and never commit `.env` to source control.

## Database tables (expected)

The code assumes the following tables exist in Supabase (names inferred from `src/controllers`):

- `gmail_tokens` — stores OAuth tokens for a connected Gmail account
  - Columns: `access_token`, `refresh_token`, `scope`, `token_type`, `expiry_date`

- `messages` — stores raw messages (ingested from Gmail or user input)
  - Columns: `id` (pk), `source` (string: `user` or `gmail`), `content` (text), `created_at`

- `insights` — stores parsed AI outputs
  - Columns: `id` (pk), `summary` (text), `risks` (jsonb/array), `action_items` (jsonb/array), `connections` (jsonb/array), `created_at`

Create these tables in Supabase or adjust the service code to match your schema.

## HTTP API (for frontend)

Base URL (local): `http://localhost:3000`
Default request header: `Content-Type: application/json`

### 1) POST /analyze

- Purpose: Persist provided messages and run Gemini analysis.
- Request body:

```json
{
  "messages": ["Message 1 text", "Message 2 text"]
}
```

- Successful response (200) — JSON insight object:

```json
{
  "summary": "Two-sentence executive summary",
  "risks": [
    { "title": "Risk title", "severity": "HIGH|MEDIUM|LOW", "reason": "Why" }
  ],
  "action_items": ["Action item 1"],
  "connections": ["Related people or teams"]
}
```

- Errors:
  - 400: invalid request body (validate `messages` on the client)
  - 500: server error — returns `{ "error": "Analysis failed" }` in current implementation

Example fetch (frontend):

```js
await fetch('/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: ['Please review Q2', 'Need ETA by Friday'] })
}).then(r => r.json());
```

### 2) GET /gmail/messages

- Purpose: Return a compact list of recent Gmail messages from the connected account.
- Request: `GET /gmail/messages`
- Response example:

```json
[
  { "id": "gmail-message-id", "subject": "Subject", "from": "Alice <alice@example.com>", "snippet": "Message snippet" }
]
```

- Errors: 401/403/500 if tokens are missing/invalid or Gmail API calls fail. Frontend should show a "Connect Gmail" option if connection is missing.

### 3) POST /gmail/analyze

- Purpose: Backend fetches recent Gmail messages, persists them, runs Gemini analysis (same flow as `/analyze`) and returns insights.
- Request: `POST /gmail/analyze` (no body required by current implementation)
- Response: same insight JSON shape as `/analyze`.

## OAuth / frontend integration details

The backend exposes a simple OAuth handshake for Gmail:

- `GET /auth/google` — opens Google's consent screen (backend redirects to Google).
- `GET /auth/google/callback` — OAuth redirect target; backend exchanges code for tokens and persists them to Supabase.

Frontend integration pattern (recommended):

1. Open `/auth/google` in a popup window.
2. The OAuth callback page in the backend sends a postMessage to the opener and closes itself:

```js
// in src/controllers/auth.controller.js the callback includes:
// window.opener && window.opener.postMessage({ status: 'connected' }, '*')
```

3. In the frontend, listen for the `message` event and refresh the UI or call `GET /gmail/messages`.

Popup example (frontend):

```js
const popup = window.open('/auth/google', 'connectGmail', 'width=600,height=700');

window.addEventListener('message', (ev) => {
  if (ev.data?.status === 'connected') {
    // update app state, fetch /gmail/messages
  }
});

// fallback: poll until popup closes and then call /gmail/messages
const poll = setInterval(() => {
  if (popup.closed) {
    clearInterval(poll);
    fetch('/gmail/messages').then(...);
  }
}, 500);
```

## Embeddings utility

The project includes `src/services/embedding.js` which exports `generateEmbedding(text)` that calls Gemini's `gemini-embedding-001` model and returns a 768-dimensional vector. This is a server-side utility and not exposed as a public endpoint by default.

## Error handling and caveats

- The code expects Gemini to return strict JSON. The controllers strip triple-backtick fences and call `JSON.parse` on the model output. If the model returns malformed JSON, parsing errors will occur — add retry logic and user-facing guidance on the frontend.
- Google API token refresh is supported by `googleapis` in memory, but refreshed tokens are not automatically saved back into Supabase in the current implementation.

## Security

- Never expose `SUPABASE_API`, `GEMINI_API_KEY` or `GOOGLE_CLIENT_SECRET` to the frontend.
- Use HTTPS in production and configure CORS to restrict allowed origins (see `src/index.js`).

## Development notes & suggestions

- Add a user identifier to `gmail_tokens`, `messages`, and `insights` to support multi-user usage.
- Persist refreshed Google tokens when `googleapis` refreshes credentials.
- Add input validation and sanitization in controllers.
- Add unit tests that mock the Gemini client and Supabase client.

## Troubleshooting

- If OAuth immediately fails, verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and that your Google Cloud OAuth consent screen and redirect URIs include `http://localhost:3000/auth/google/callback`.
- If Gemini calls fail, verify `GEMINI_API_KEY` and network access.
- If Supabase writes fail, verify `SUPABASE_URL` and `SUPABASE_API` and that the expected tables exist.

## Next steps

- Add example frontend components (React) for the analyze form, results rendering, and OAuth popup handler.
- Add CI and unit tests to validate controller behavior.

---

File: `README.md` created at repository root to document the project for frontend and backend developers.
