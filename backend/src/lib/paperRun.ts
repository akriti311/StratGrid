import type {
  ExecutionSource,
  ExecutionStatus,
  PaperActionLog,
  TriggerSnapshot,
} from '../models/Execution'
import { evaluateTrigger } from './evaluate'
import { parseGraph, validateParsedGraph, type ParsedAction } from './graph'
import { lastFiredAtMs } from './triggerState'

const VENUE_LABEL: Record<ParsedAction['kind'], string> = {
  lighter: 'Lighter',
  backpack: 'Backpack',
  hyperliquid: 'Hyperliquid',
}

export type PaperRunResult = {
  status: ExecutionStatus
  source: ExecutionSource
  triggerSnapshot: TriggerSnapshot
  actions: PaperActionLog[]
  firedTriggerIds: string[]
}

export function runPaperWorkflow(input: {
  nodes: unknown[]
  edges: unknown[]
  source: ExecutionSource
  solPrice: number
  now?: number
  triggerState?: unknown
  priceCooldownMs?: number
}): { ok: false; errors: string[] } | { ok: true; result: PaperRunResult } {
  const graph = parseGraph(input.nodes, input.edges)
  const errors = validateParsedGraph(graph)
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const now = input.now ?? Date.now()
  const evals = graph.triggers.map((trigger) => ({
    trigger,
    evaluation: evaluateTrigger(trigger, {
      source: input.source,
      solPrice: input.solPrice,
      now,
      lastFiredAt: lastFiredAtMs(input.triggerState, trigger.id),
      priceCooldownMs: input.priceCooldownMs,
    }),
  }))
  const matched = evals.filter((item) => item.evaluation.matched)
  const actionById = new Map(graph.actions.map((action) => [action.id, action]))

  if (matched.length === 0) {
    const primary = evals[0]!
    return {
      ok: true,
      result: {
        status: 'no_match',
        source: input.source,
        triggerSnapshot: {
          nodeId: primary.trigger.id,
          kind: primary.trigger.kind,
          label: primary.trigger.label,
          observedPrice: primary.evaluation.observedPrice ?? input.solPrice,
          reason: evals.map((item) => item.evaluation.reason).join('; '),
        },
        actions: [],
        firedTriggerIds: [],
      },
    }
  }

  const seen = new Set<string>()
  const actions: PaperActionLog[] = []
  for (const item of matched) {
    for (const edge of graph.edges.filter((e) => e.source === item.trigger.id)) {
      if (seen.has(edge.target)) {
        continue
      }
      seen.add(edge.target)
      const action = actionById.get(edge.target)
      if (action) {
        actions.push(toPaperAction(action))
      }
    }
  }

  const primary = matched[0]!
  return {
    ok: true,
    result: {
      status: 'matched',
      source: input.source,
      triggerSnapshot: {
        nodeId: primary.trigger.id,
        kind: primary.trigger.kind,
        label: primary.trigger.label,
        observedPrice: primary.evaluation.observedPrice ?? input.solPrice,
        reason: matched.map((item) => item.evaluation.reason).join('; '),
      },
      actions,
      firedTriggerIds: matched.map((item) => item.trigger.id),
    },
  }
}

function toPaperAction(action: ParsedAction): PaperActionLog {
  const venue = VENUE_LABEL[action.kind]
  const side = action.side.toUpperCase()
  return {
    nodeId: action.id,
    kind: action.kind,
    side: action.side,
    leverage: action.leverage,
    size: action.size,
    result: 'paper',
    message: `Paper: would place ${side} ${action.leverage}x size ${action.size} on ${venue}`,
  }
}
