import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { config } from './config'
import { connectDb } from './db'
import { authRouter } from './routes/auth'
import { credentialRouter } from './routes/credentials'
import { marketRouter } from './routes/market'
import { workflowRouter } from './routes/workflows'
import { startPoller } from './lib/poller'

const app = express()

app.use(
  cors({
    origin: config.corsOrigin,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    poller: {
      intervalMs: config.pollIntervalMs,
      priceCooldownMs: config.priceCooldownMs,
    },
  })
})

app.use('/api/auth', authRouter)
app.use('/api/workflows', workflowRouter)
app.use('/api/credentials', credentialRouter)
app.use('/api/market', marketRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

async function main(): Promise<void> {
  await connectDb()
  app.listen(config.port, () => {
    console.log(`StratGrid API listening on http://localhost:${config.port}`)
    startPoller()
  })
}

main().catch((error) => {
  console.error('Failed to start server. Is MongoDB running?', error)
  process.exit(1)
})
