export type PriceOperator = '<' | '>' | '<=' | '>='

export type ParsedTrigger = {
  id: string
  kind: 'price-trigger' | 'timer-trigger'
  label?: string
  metadata: Record<string, unknown>
}

export type ParsedAction = {
  id: string
  kind: 'lighter' | 'backpack' | 'hyperliquid'
  label?: string
  side: string
  leverage: number
  size: number
}

export type ParsedEdge = {
  id: string
  source: string
  target: string
}

export type ParsedGraph = {
  triggers: ParsedTrigger[]
  actions: ParsedAction[]
  edges: ParsedEdge[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function parseGraph(rawNodes: unknown, rawEdges: unknown): ParsedGraph {
  const triggers: ParsedTrigger[] = []
  const actions: ParsedAction[] = []

  if (Array.isArray(rawNodes)) {
    for (const item of rawNodes) {
      if (!isRecord(item) || !isRecord(item.data)) {
        continue
      }
      const id = asString(item.id)
      if (!id) {
        continue
      }
      const data = item.data
      const kind = asString(data.kind)
      const label = asString(data.label)
      const metadata = isRecord(data.metadata) ? data.metadata : {}
      const rfType = asString(item.type) ?? asString(data.type)

      if (rfType === 'trigger' && (kind === 'price-trigger' || kind === 'timer-trigger')) {
        triggers.push({ id, kind, label, metadata })
      }

      if (
        rfType === 'action' &&
        (kind === 'lighter' || kind === 'backpack' || kind === 'hyperliquid')
      ) {
        const side = asString(metadata.side) ?? 'long'
        const leverage = asNumber(metadata.leverage) ?? 0
        const size = asNumber(metadata.size) ?? 0
        actions.push({ id, kind, label, side, leverage, size })
      }
    }
  }

  const edges: ParsedEdge[] = []
  const nodeIds = new Set([
    ...triggers.map((node) => node.id),
    ...actions.map((node) => node.id),
  ])
  const seen = new Set<string>()

  if (Array.isArray(rawEdges)) {
    for (const item of rawEdges) {
      if (!isRecord(item)) {
        continue
      }
      const id = asString(item.id)
      const source = asString(item.source)
      const target = asString(item.target)
      if (!id || !source || !target) {
        continue
      }
      if (!nodeIds.has(source) || !nodeIds.has(target)) {
        continue
      }
      const key = `${source}->${target}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      edges.push({ id, source, target })
    }
  }

  return { triggers, actions, edges }
}

export function validateParsedGraph(graph: ParsedGraph): string[] {
  const errors: string[] = []
  if (graph.triggers.length < 1) {
    errors.push('Add at least one trigger')
  }
  if (graph.actions.length < 1) {
    errors.push('Add at least one action')
  }
  if (graph.triggers.length >= 1 && graph.actions.length >= 1 && graph.edges.length < 1) {
    errors.push('Connect the trigger to at least one action')
  }

  for (const trigger of graph.triggers) {
    if (trigger.kind === 'price-trigger') {
      const asset = asString(trigger.metadata.asset)?.trim()
      const operator = asString(trigger.metadata.operator)
      const threshold = asNumber(trigger.metadata.threshold)
      if (!asset || !isOperator(operator) || threshold === undefined) {
        errors.push('Price trigger needs an asset and threshold')
      }
    }
    if (trigger.kind === 'timer-trigger') {
      const minutes = asNumber(trigger.metadata.minutes)
      if (minutes === undefined || minutes <= 0) {
        errors.push('Timer trigger needs minutes greater than 0')
      }
    }
  }

  for (const action of graph.actions) {
    if (action.leverage <= 0 || action.size <= 0) {
      errors.push(`${action.label ?? action.kind} needs valid side, leverage, and size`)
    }
  }

  return [...new Set(errors)]
}

export function isOperator(value: string | undefined): value is PriceOperator {
  return value === '<' || value === '>' || value === '<=' || value === '>='
}
