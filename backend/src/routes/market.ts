import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_SOL_PRICE, getSolPrice, setSolPrice, SOL_SYMBOL } from '../lib/demoPrice'
import { requireAuth } from '../middleware/auth'

export const marketRouter = Router()

marketRouter.use(requireAuth)

const priceSchema = z.object({
  price: z.number().finite().positive().max(1_000_000),
})

marketRouter.get('/sol', async (req, res) => {
  const price = await getSolPrice(req.userId!)
  res.json({ symbol: SOL_SYMBOL, price, defaultPrice: DEFAULT_SOL_PRICE })
})

marketRouter.put('/sol', async (req, res) => {
  const parsed = priceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'price must be a positive number' })
    return
  }

  const result = await setSolPrice(req.userId!, parsed.data.price)
  res.json(result)
})
