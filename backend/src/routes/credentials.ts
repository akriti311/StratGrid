import { Router } from 'express'
import { z } from 'zod'
import { encryptSecret } from '../lib/crypto'
import { requireAuth } from '../middleware/auth'
import { Credential, VENUES } from '../models/Credential'

export const credentialRouter = Router()

credentialRouter.use(requireAuth)

const upsertSchema = z.object({
  apiKey: z.string().trim().min(1),
  apiSecret: z.string().trim().min(1),
})

const venueSchema = z.enum(VENUES)

credentialRouter.get('/', async (req, res) => {
  const docs = await Credential.find({ userId: req.userId }).select('venue')
  const connected = new Set(docs.map((doc) => doc.venue))
  res.json({
    credentials: VENUES.map((venue) => ({
      venue,
      connected: connected.has(venue),
    })),
  })
})

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

credentialRouter.put('/:venue', async (req, res) => {
  const venueParsed = venueSchema.safeParse(routeParam(req.params.venue))
  if (!venueParsed.success) {
    res.status(400).json({ error: 'Unknown venue' })
    return
  }

  const bodyParsed = upsertSchema.safeParse(req.body)
  if (!bodyParsed.success) {
    res.status(400).json({ error: 'apiKey and apiSecret are required' })
    return
  }

  const ciphertext = encryptSecret(
    JSON.stringify({
      apiKey: bodyParsed.data.apiKey,
      apiSecret: bodyParsed.data.apiSecret,
    }),
  )

  await Credential.findOneAndUpdate(
    { userId: req.userId, venue: venueParsed.data },
    { $set: { ciphertext } },
    { upsert: true, new: true },
  )

  res.json({ venue: venueParsed.data, connected: true })
})

credentialRouter.delete('/:venue', async (req, res) => {
  const venueParsed = venueSchema.safeParse(routeParam(req.params.venue))
  if (!venueParsed.success) {
    res.status(400).json({ error: 'Unknown venue' })
    return
  }

  await Credential.findOneAndDelete({
    userId: req.userId,
    venue: venueParsed.data,
  })

  res.json({ ok: true })
})
