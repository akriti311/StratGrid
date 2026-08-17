export type TriggerState = Record<string, { lastFiredAt: string }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function lastFiredAtMs(state: unknown, nodeId: string): number | undefined {
  if (!isRecord(state)) {
    return undefined
  }
  const entry = state[nodeId]
  if (!isRecord(entry) || typeof entry.lastFiredAt !== 'string') {
    return undefined
  }
  const ms = Date.parse(entry.lastFiredAt)
  return Number.isFinite(ms) ? ms : undefined
}

export function stampFiredTriggers(
  state: unknown,
  firedIds: string[],
  now: Date,
): TriggerState {
  const next: TriggerState = {}
  if (isRecord(state)) {
    for (const [id, entry] of Object.entries(state)) {
      if (isRecord(entry) && typeof entry.lastFiredAt === 'string') {
        next[id] = { lastFiredAt: entry.lastFiredAt }
      }
    }
  }
  const stamp = now.toISOString()
  for (const id of firedIds) {
    next[id] = { lastFiredAt: stamp }
  }
  return next
}
