import 'dotenv/config'

function envMs(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 1000 ? value : fallback
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri:
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/stratgrid',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtExpiresIn: '7d' as const,
  credentialsKey:
    process.env.CREDENTIALS_KEY ?? 'dev-only-credentials-key-change-me',
  pollIntervalMs: envMs('POLL_INTERVAL_MS', 10_000),
  priceCooldownMs: envMs('PRICE_COOLDOWN_MS', 60_000),
}
