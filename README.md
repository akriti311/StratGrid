# StratGrid

A workflow builder for automated crypto strategies. Sign up, draw **when → then** rules on a canvas, save them, and paper-run simulated trades.

**Demo video:** _add your Loom link here_

---

## What it does

Design a strategy such as:

```text
When SOL < 150
  → LONG  10x on Lighter
  → SHORT 2x on Backpack
  → SHORT 2x on Hyperliquid
```

Set a **demo SOL price**, click **Test run**, and see a history of why the trigger fired and which paper orders would be placed. Enable a workflow and a background poller evaluates it every 10 seconds, with a cooldown so the same price trigger does not spam.

Orders are **paper only**. StratGrid does not send live orders to exchanges.

---

## Stack

| Layer | Choice |
|--------|--------|
| Frontend | React, TypeScript, Vite, React Flow, Tailwind |
| Backend | Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcrypt |
| Credentials | AES-256-GCM at rest |

---

## How to run

**Needs:** Node.js 20+ and two terminals. MongoDB on `27017` is optional. If it is not running, the API starts an in-memory database (data is wiped when the API restarts).

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (on this machine, prefer `localhost` over `127.0.0.1`). Vite proxies `/api` to the backend.

Password must be at least 8 characters.

### Environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Mongo connection (defaults to local) |
| `JWT_SECRET` | Signs login tokens |
| `CREDENTIALS_KEY` | Encrypts venue API keys |
| `CORS_ORIGIN` | Frontend origin (default `http://localhost:5173`) |
| `POLL_INTERVAL_MS` | Poller interval (default 10000) |
| `PRICE_COOLDOWN_MS` | Price-trigger cooldown (default 60000) |

Never commit `.env`.

---

## Demo walkthrough

1. Sign up and create a workflow.
2. Click **SOL dip template**, then **Save**.
3. Leave demo SOL at **148** and click **Test run**. History should show a match and three paper actions.
4. Set SOL to **160** and Test run again — **No match**.
5. Set SOL back to **148**, click **Running**, and wait up to 10 seconds for a **Poller** line. It should not fire again for 60 seconds while the price stays below 150.

---

## How it works

```text
Browser (editor, login, history)
        │
        ▼
Express API (JWT)
        │
        ├── MongoDB
        │     Users, Workflows, Credentials, DemoPrice, Executions
        └── In-process poller
              reads enabled workflows + demo SOL
              writes paper Executions when a trigger matches
```

**Triggers:** price (`SOL < 150`) or timer (every N minutes).  
**Actions:** Lighter, Backpack, Hyperliquid (side, leverage, size). Edges are trigger → action only.

**Test run** evaluates now and ignores cooldown.  
**Poller** only runs `enabled` workflows. Price triggers wait `PRICE_COOLDOWN_MS` after a fire. Timer triggers wait `minutes`.

Venue credentials are stored encrypted for a possible later Live mode. Paper runs do not need them.

---

## Tests

```bash
cd backend
npm test
```

Covers price operators, cooldown, timers, and the SOL dip paper path.

---

## Project layout

```text
frontend/    editor, auth, credentials, execution timeline
backend/     API, paper executor, poller
```
