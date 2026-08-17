import type { ExecutionSource } from '../models/Execution'
import {
  isOperator,
  type ParsedTrigger,
  type PriceOperator,
} from './graph'

export function comparePrice(
  price: number,
  operator: PriceOperator,
  threshold: number,
): boolean {
  switch (operator) {
    case '<':
      return price < threshold
    case '>':
      return price > threshold
    case '<=':
      return price <= threshold
    case '>=':
      return price >= threshold
  }
}

export type EvaluateContext = {
  source: ExecutionSource
  solPrice: number
  now?: number
  lastFiredAt?: number
  priceCooldownMs?: number
}

export type TriggerEval = {
  matched: boolean
  reason: string
  observedPrice?: number
  skippedByCooldown?: boolean
}

function cooldownRemainingMs(
  lastFiredAt: number | undefined,
  now: number,
  cooldownMs: number,
): number {
  if (lastFiredAt === undefined) {
    return 0
  }
  return Math.max(0, lastFiredAt + cooldownMs - now)
}

export function evaluateTrigger(
  trigger: ParsedTrigger,
  ctx: EvaluateContext,
): TriggerEval {
  const now = ctx.now ?? Date.now()
  const skipCooldown = ctx.source === 'test-run'

  if (trigger.kind === 'timer-trigger') {
    const minutes = Number(trigger.metadata.minutes)
    if (skipCooldown) {
      return {
        matched: true,
        reason: `Timer every ${minutes} min (test run)`,
      }
    }
    const cooldownMs = Math.max(1, minutes) * 60_000
    const remaining = cooldownRemainingMs(ctx.lastFiredAt, now, cooldownMs)
    if (remaining > 0) {
      return {
        matched: false,
        skippedByCooldown: true,
        reason: `Timer every ${minutes} min is in cooldown`,
      }
    }
    return {
      matched: true,
      reason: `Timer every ${minutes} min (poller)`,
    }
  }

  const asset = String(trigger.metadata.asset ?? '').trim().toUpperCase() || 'SOL'
  const operatorRaw = String(trigger.metadata.operator)
  const operator = isOperator(operatorRaw) ? operatorRaw : '<'
  const threshold = Number(trigger.metadata.threshold)
  const condition = `${asset} ${operator} ${threshold}`

  if (asset !== 'SOL') {
    return {
      matched: false,
      reason: `No demo price for ${asset} (paper mode tracks SOL only)`,
    }
  }

  const conditionMet = comparePrice(ctx.solPrice, operator, threshold)
  if (!conditionMet) {
    return {
      matched: false,
      observedPrice: ctx.solPrice,
      reason: `SOL was ${ctx.solPrice}, condition ${condition} not met`,
    }
  }

  if (!skipCooldown) {
    const cooldownMs = ctx.priceCooldownMs ?? 60_000
    const remaining = cooldownRemainingMs(ctx.lastFiredAt, now, cooldownMs)
    if (remaining > 0) {
      return {
        matched: false,
        skippedByCooldown: true,
        observedPrice: ctx.solPrice,
        reason: `SOL was ${ctx.solPrice} (${condition}) but cooldown is active`,
      }
    }
  }

  const sourceLabel = ctx.source === 'test-run' ? 'test run' : 'poller'
  return {
    matched: true,
    observedPrice: ctx.solPrice,
    reason: `SOL was ${ctx.solPrice} (${condition}, ${sourceLabel})`,
  }
}
