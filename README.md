# Universal Session Manager (USM)

> Chat with any AI model. Switch seamlessly. Full context always.

[![Netlify Status](https://api.netlify.com/api/v1/badges/53b4be4a-b00c-4140-b4a9-c34f942c9561/deploy-status)](https://app.netlify.com/projects/universalsessionmanager/deploys)

USM is a single chat interface that lets you talk to any free-tier AI model — Claude, ChatGPT, Gemini, or Mistral. When one model hits its token/context limit, switch to another model and **the full conversation history carries over automatically**. No summarization. No compression. Full context always.

---

## Features

- **Multi-Provider Chat** — Talk to Claude, ChatGPT, Gemini, and Mistral from one interface
- **Seamless Model Switching** — Switch models mid-conversation with one click
- **Full Context Carry-Over** — Complete, unmodified conversation history injected into the new model
- **Token Usage Tracking** — Visual token bar with warnings at 80% and 95%
- **Smart Model Filtering** — Switch modal only shows models that can fit your full conversation
- **Session Management** — Create, search, and manage multiple sessions
- **Privacy First** — All data stored locally, API keys never leave your machine
- **Dark & Light Themes** — Toggle between themes with the button in the top-right corner; preference saved locally

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- API keys for the AI providers you want to use (get them from each provider's website)

### Installation

```bash
# Clone/navigate to the project
cd USManager

# Install all dependencies
npm run install:all
# OR manually:
npm install
cd server && npm install && cd ../client && npm install && cd ..
```

### Run

```bash
npm run dev
```

This starts both the Express server (port 3001) and Vite dev server (port 5173).

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Add API Keys

1. Click **Settings** (bottom-left of sidebar)
2. Enter your API keys for each provider
3. Keys are stored locally in SQLite — never sent anywhere except the respective AI provider

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS v4 (Vite) |
| Backend | Node.js + Express |
| Database | SQLite (sql.js — pure JavaScript) |
| AI SDKs | Anthropic, OpenAI, Google GenAI, Mistral REST |

---

## Architecture

```
USManager/
├── client/          # React frontend (Vite + Tailwind)
│   └── src/
│       ├── components/   # UI components
│       ├── context/      # Global state management
│       ├── hooks/        # Custom hooks (unused in v1, logic in context)
│       └── utils/        # Providers config, token estimator, formatters
│
├── server/          # Express backend
│   ├── routes/      # API routes (sessions, chat, providers)
│   ├── services/    # AI provider handlers (Claude, OpenAI, Gemini, Mistral)
│   ├── db/          # SQLite schema and database wrapper
│   └── middleware/   # Error handling
│
└── package.json     # Root scripts (concurrently runs both)
```

---

## How Model Switching Works

1. You chat with Model A (e.g., Claude Sonnet)
2. Token usage bar fills up → warnings at 80% and 95%
3. Click "Switch Model" → modal shows only models that can fit your full history
4. Select Model B (e.g., Gemini Flash with 32k context)
5. Next message sends the **complete, unmodified history** to Model B
6. Model B responds with full context awareness
7. A visual divider marks the switch point in the chat

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New Session |
| `Ctrl+K` | Switch Model |
| `Enter` | Send Message |
| `Shift+Enter` | New Line |
| `Escape` | Close Modals |
| `Ctrl+Shift+L` | Toggle Theme |

---

## Privacy

- All data stored locally in SQLite (`server/usm.db`) during local development
- When deployed to Netlify, data is stored in Turso (SQLite-compatible cloud database)
- API keys stored in the local database only (or Turso when deployed)
- Keys are sent **only** to the respective AI provider's API endpoint
- No cloud sync, no user accounts, no telemetry

---

## Deploy to Netlify

This project is fully configured for Netlify deployment with serverless functions.

### Prerequisites

1. **Create a free Turso database** (SQLite-compatible, required for persistent data):
   - Sign up at [turso.tech](https://turso.tech)
   - Create a database: `turso db create usm`
   - Get your database URL and auth token:
     ```bash
     turso db show usm --url          # Copy this URL
     turso db tokens create usm       # Copy this token
     ```

### Deploy Steps

1. **Push your code to GitHub**

2. **Connect to Netlify**:
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo and select it

3. **Set Environment Variables** (Site settings → Environment variables):
   - `TURSO_DATABASE_URL` — your Turso database URL
   - `TURSO_AUTH_TOKEN` — your Turso auth token

4. **Deploy** — Netlify will automatically:
   - Build the React frontend (Vite)
   - Install and bundle the serverless functions
   - Configure `/api/*` redirects to Netlify Functions

### Local Development (unchanged)

```bash
npm run dev
```

Both the Express server and Vite dev server run as before. The Netlify functions are only used in production.

### Architecture on Netlify

```
Netlify Site
├── Static Files (client/dist/)     → React SPA
└── Netlify Functions (api.js)      → Serverless API
    └── Turso Database              → Persistent SQLite-compatible storage
```

### Function Timeout

The `/api/chat` endpoint has a 120-second timeout configured in `netlify.toml` to handle long AI responses.
