import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config'
import { requireAuth } from '../middleware/auth'
import { User } from '../models/User'

export const authRouter = Router()

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => value.trim().length >= 8, 'Password cannot be only spaces'),
})

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

function publicUser(user: { _id: { toString(): string }; email: string }) {
  return { id: user._id.toString(), email: user.email }
}

authRouter.post('/signup', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await User.findOne({ email })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  try {
    const user = await User.create({ email, passwordHash })
    const token = signToken(user._id.toString())
    res.status(201).json({ token, user: publicUser(user) })
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }
    throw err
  }
})

authRouter.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return
  }

  const email = parsed.data.email.toLowerCase()
  const user = await User.findOne({ email })
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken(user._id.toString())
  res.json({ token, user: publicUser(user) })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return
  }

  res.json({ user: publicUser(user) })
})
