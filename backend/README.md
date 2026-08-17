# StratGrid backend

Express + TypeScript + MongoDB API.

## Run locally

1. Install [MongoDB](https://www.mongodb.com/docs/manual/installation/) and start it (default `mongodb://127.0.0.1:27017`).
2. Copy env and install:

```bash
cp .env.example .env
npm install
npm run dev
```

Health check: `GET http://localhost:4000/api/health`

## Auth

- `POST /api/auth/signup` `{ email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me` header `Authorization: Bearer <token>`
