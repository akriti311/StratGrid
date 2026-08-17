import assert from 'node:assert/strict'
import test from 'node:test'
import { comparePrice, evaluateTrigger } from './evaluate'
import type { ParsedTrigger } from './graph'

const price = (operator: '<' | '>' | '<=' | '>=', threshold = 150): ParsedTrigger => ({
  id: 't1',
  kind: 'price-trigger',
  metadata: { asset: 'SOL', operator, threshold },
})

const timer: ParsedTrigger = {
  id: 't2',
  kind: 'timer-trigger',
  metadata: { minutes: 5 },
}

test('comparePrice operators', () => {
  assert.equal(comparePrice(148, '<', 150), true)
  assert.equal(comparePrice(150, '<', 150), false)
  assert.equal(comparePrice(150, '<=', 150), true)
  assert.equal(comparePrice(151, '>', 150), true)
  assert.equal(comparePrice(150, '>', 150), false)
  assert.equal(comparePrice(150, '>=', 150), true)
})

test('test-run ignores price cooldown', () => {
  const result = evaluateTrigger(price('<'), {
    source: 'test-run',
    solPrice: 148,
    now: 10_000,
    lastFiredAt: 9_000,
    priceCooldownMs: 60_000,
  })
  assert.equal(result.matched, true)
  assert.equal(result.skippedByCooldown, undefined)
})

test('poller cooldown blocks a matching price trigger', () => {
  const blocked = evaluateTrigger(price('<'), {
    source: 'poller',
    solPrice: 148,
    now: 30_000,
    lastFiredAt: 0,
    priceCooldownMs: 60_000,
  })
  assert.equal(blocked.matched, false)
  assert.equal(blocked.skippedByCooldown, true)

  const due = evaluateTrigger(price('<'), {
    source: 'poller',
    solPrice: 148,
    now: 60_000,
    lastFiredAt: 0,
    priceCooldownMs: 60_000,
  })
  assert.equal(due.matched, true)
})

test('unmatched price is not a cooldown skip', () => {
  const result = evaluateTrigger(price('<'), {
    source: 'poller',
    solPrice: 160,
    now: 0,
    priceCooldownMs: 60_000,
  })
  assert.equal(result.matched, false)
  assert.equal(result.skippedByCooldown, undefined)
})

test('timer fires on first poller tick then waits minutes', () => {
  const first = evaluateTrigger(timer, { source: 'poller', solPrice: 148, now: 0 })
  assert.equal(first.matched, true)

  const cooling = evaluateTrigger(timer, {
    source: 'poller',
    solPrice: 148,
    now: 60_000,
    lastFiredAt: 0,
  })
  assert.equal(cooling.matched, false)
  assert.equal(cooling.skippedByCooldown, true)

  const due = evaluateTrigger(timer, {
    source: 'poller',
    solPrice: 148,
    now: 5 * 60_000,
    lastFiredAt: 0,
  })
  assert.equal(due.matched, true)
})

test('non-SOL assets do not use the demo price', () => {
  const result = evaluateTrigger(
    {
      id: 'btc',
      kind: 'price-trigger',
      metadata: { asset: 'BTC', operator: '<', threshold: 1 },
    },
    { source: 'test-run', solPrice: 148 },
  )
  assert.equal(result.matched, false)
  assert.match(result.reason, /BTC/)
})
