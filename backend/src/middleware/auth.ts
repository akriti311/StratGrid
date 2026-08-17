import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { config } from '../config'

export type AuthPayload = {
  sub: string
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Missing auth token' })
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload
    if (!payload.sub) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }
    if (!mongoose.isValidObjectId(payload.sub)) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
