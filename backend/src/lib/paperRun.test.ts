import assert from 'node:assert/strict'
import test from 'node:test'
import { parseGraph, validateParsedGraph } from './graph'
import { runPaperWorkflow } from './paperRun'
import { lastFiredAtMs, stampFiredTriggers } from './triggerState'

const solDip = {
  nodes: [
    {
      id: 'trigger-sol-dip',
      type: 'trigger',
      position: { x: 80, y: 160 },
      data: {
        type: 'trigger',
        kind: 'price-trigger',
        metadata: { asset: 'SOL', operator: '<', threshold: 150 },
        label: 'SOL < 150',
      },
    },
    {
      id: 'action-lighter',
      type: 'action',
      position: { x: 420, y: 40 },
      data: {
        type: 'action',
        kind: 'lighter',
        metadata: { side: 'long', leverage: 10, size: 1 },
      },
    },
    {
      id: 'action-backpack',
      type: 'action',
      position: { x: 420, y: 160 },
      data: {
        type: 'action',
        kind: 'backpack',
        metadata: { side: 'short', leverage: 2, size: 1 },
      },
    },
    {
      id: 'action-hyperliquid',
      type: 'action',
      position: { x: 420, y: 280 },
      data: {
        type: 'action',
        kind: 'hyperliquid',
        metadata: { side: 'short', leverage: 2, size: 1 },
      },
    },
  ],
  edges: [
    { id: 'e-sol-lighter', source: 'trigger-sol-dip', target: 'action-lighter' },
    { id: 'e-sol-backpack', source: 'trigger-sol-dip', target: 'action-backpack' },
    { id: 'e-sol-hyperliquid', source: 'trigger-sol-dip', target: 'action-hyperliquid' },
  ],
}

test('SOL dip template parses and validates', () => {
  const graph = parseGraph(solDip.nodes, solDip.edges)
  assert.equal(graph.triggers.length, 1)
  assert.equal(graph.actions.length, 3)
  assert.equal(graph.edges.length, 3)
  assert.deepEqual(validateParsedGraph(graph), [])
})

test('test-run matches SOL dip at 148 with three paper actions', () => {
  const ran = runPaperWorkflow({
    ...solDip,
    source: 'test-run',
    solPrice: 148,
  })
  assert.equal(ran.ok, true)
  if (!ran.ok) return
  assert.equal(ran.result.status, 'matched')
  assert.equal(ran.result.actions.length, 3)
  assert.ok(ran.result.actions.every((action) => action.result === 'paper'))
  assert.match(ran.result.actions[0]!.message, /Lighter/)
})

test('test-run does not match SOL dip at 160', () => {
  const ran = runPaperWorkflow({
    ...solDip,
    source: 'test-run',
    solPrice: 160,
  })
  assert.equal(ran.ok, true)
  if (!ran.ok) return
  assert.equal(ran.result.status, 'no_match')
  assert.equal(ran.result.actions.length, 0)
})

test('poller cooldown prevents a second match', () => {
  const first = runPaperWorkflow({
    ...solDip,
    source: 'poller',
    solPrice: 148,
    now: 0,
    priceCooldownMs: 60_000,
  })
  assert.equal(first.ok, true)
  if (!first.ok) return
  assert.equal(first.result.status, 'matched')

  const state = stampFiredTriggers({}, first.result.firedTriggerIds, new Date(0))
  assert.equal(lastFiredAtMs(state, 'trigger-sol-dip'), 0)

  const second = runPaperWorkflow({
    ...solDip,
    source: 'poller',
    solPrice: 148,
    now: 30_000,
    triggerState: state,
    priceCooldownMs: 60_000,
  })
  assert.equal(second.ok, true)
  if (!second.ok) return
  assert.equal(second.result.status, 'no_match')
  assert.equal(second.result.actions.length, 0)
})

test('empty graph is rejected', () => {
  const ran = runPaperWorkflow({
    nodes: [],
    edges: [],
    source: 'test-run',
    solPrice: 148,
  })
  assert.equal(ran.ok, false)
  if (ran.ok) return
  assert.ok(ran.errors.length > 0)
})

test('dangling edges are dropped', () => {
  const graph = parseGraph(solDip.nodes, [
    ...solDip.edges,
    { id: 'ghost', source: 'trigger-sol-dip', target: 'missing' },
  ])
  assert.equal(graph.edges.length, 3)
})
