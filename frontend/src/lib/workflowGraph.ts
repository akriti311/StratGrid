import type { Edge } from '@xyflow/react'

import type {
  ActionKind,
  ActionMetadata,
  NodeMetadata,
  PriceTriggerMetadata,
  TimerTriggerMetadata,
  TriggerMetadata,
  WorkflowNode,
  WorkflowNodeKind,
} from '@/types/workflow'

export const VENUE_LABEL: Record<ActionKind, string> = {
  lighter: 'Lighter',
  backpack: 'Backpack',
  hyperliquid: 'Hyperliquid',
}

export function isPriceTriggerMetadata(
  metadata: NodeMetadata | undefined,
): metadata is PriceTriggerMetadata {
  return Boolean(metadata && 'asset' in metadata && 'threshold' in metadata)
}

export function isTimerTriggerMetadata(
  metadata: NodeMetadata | undefined,
): metadata is TimerTriggerMetadata {
  return Boolean(metadata && 'minutes' in metadata && !('asset' in metadata))
}

export function isActionMetadata(
  metadata: NodeMetadata | undefined,
): metadata is ActionMetadata {
  return Boolean(metadata && 'side' in metadata && 'leverage' in metadata)
}

export function labelForTrigger(
  kind: WorkflowNodeKind,
  metadata: TriggerMetadata,
): string {
  if (kind === 'price-trigger' && isPriceTriggerMetadata(metadata)) {
    return `${metadata.asset} ${metadata.operator} ${metadata.threshold}`
  }
  if (kind === 'timer-trigger' && isTimerTriggerMetadata(metadata)) {
    return `Every ${metadata.minutes} min`
  }
  return kind
}

export function labelForAction(
  kind: ActionKind,
  metadata: ActionMetadata,
): string {
  const side = metadata.side.toUpperCase()
  return `${side} ${metadata.leverage}x · ${VENUE_LABEL[kind]}`
}

export function relabelNode(node: WorkflowNode): WorkflowNode {
  const { kind, metadata } = node.data
  if (node.data.type === 'trigger' && metadata && !isActionMetadata(metadata)) {
    return {
      ...node,
      data: {
        ...node.data,
        label: labelForTrigger(kind, metadata),
      },
    }
  }
  if (node.data.type === 'action' && isActionMetadata(metadata) && isActionKind(kind)) {
    return {
      ...node,
      data: {
        ...node.data,
        label: labelForAction(kind, metadata),
      },
    }
  }
  return node
}

export function isActionKind(kind: WorkflowNodeKind): kind is ActionKind {
  return kind === 'lighter' || kind === 'backpack' || kind === 'hyperliquid'
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: Edge[],
): string[] {
  const errors: string[] = []
  const triggers = nodes.filter((node) => node.data.type === 'trigger')
  const actions = nodes.filter((node) => node.data.type === 'action')

  if (triggers.length < 1) {
    errors.push('Add at least one trigger')
  }
  if (actions.length < 1) {
    errors.push('Add at least one action')
  }

  for (const node of nodes) {
    const { metadata, kind } = node.data
    if (node.data.type === 'trigger' && kind === 'price-trigger') {
      if (
        !isPriceTriggerMetadata(metadata) ||
        !metadata.asset.trim() ||
        !Number.isFinite(metadata.threshold)
      ) {
        errors.push('Price trigger needs an asset and threshold')
      }
    }
    if (node.data.type === 'trigger' && kind === 'timer-trigger') {
      if (
        !isTimerTriggerMetadata(metadata) ||
        !Number.isFinite(metadata.minutes) ||
        metadata.minutes <= 0
      ) {
        errors.push('Timer trigger needs minutes greater than 0')
      }
    }
    if (node.data.type === 'action') {
      if (
        !isActionMetadata(metadata) ||
        !Number.isFinite(metadata.leverage) ||
        !Number.isFinite(metadata.size) ||
        metadata.leverage <= 0 ||
        metadata.size <= 0
      ) {
        errors.push(`${node.data.label ?? kind} needs valid side, leverage, and size`)
      }
    }
  }

  if (triggers.length >= 1 && actions.length >= 1 && edges.length < 1) {
    errors.push('Connect the trigger to at least one action')
  }

  return [...new Set(errors)]
}

export function hydrateWorkflowNodes(raw: unknown): WorkflowNode[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const nodes: WorkflowNode[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const node = item as Partial<WorkflowNode>
    if (!node.id || !node.data || !node.position) {
      continue
    }
    if (
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number' ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y)
    ) {
      continue
    }
    const rfType = node.type ?? node.data.type
    if (rfType !== 'trigger' && rfType !== 'action') {
      continue
    }
    nodes.push(
      relabelNode({
        id: String(node.id),
        type: rfType,
        position: node.position,
        data: { ...node.data, type: rfType },
      } as WorkflowNode),
    )
  }
  return nodes
}

export function hydrateWorkflowEdges(
  raw: unknown,
  nodeIds?: Set<string>,
): Edge[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seen = new Set<string>()
  const edges: Edge[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const edge = item as Edge
    if (!edge.id || !edge.source || !edge.target) {
      continue
    }
    if (nodeIds && (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))) {
      continue
    }
    const key = `${edge.source}->${edge.target}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    edges.push({
      id: String(edge.id),
      source: String(edge.source),
      target: String(edge.target),
    })
  }
  return edges
}

export function serializeWorkflowNodes(nodes: WorkflowNode[]): unknown[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }))
}

export function serializeWorkflowEdges(edges: Edge[]): unknown[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }))
}

export function createSolDipTemplate(): {
  nodes: WorkflowNode[]
  edges: Edge[]
} {
  const triggerId = 'trigger-sol-dip'
  const lighterId = 'action-lighter'
  const backpackId = 'action-backpack'
  const hyperliquidId = 'action-hyperliquid'

  const priceMeta: PriceTriggerMetadata = {
    asset: 'SOL',
    operator: '<',
    threshold: 150,
  }

  const nodes: WorkflowNode[] = [
    {
      id: triggerId,
      type: 'trigger',
      position: { x: 80, y: 160 },
      data: {
        type: 'trigger',
        kind: 'price-trigger',
        metadata: priceMeta,
        label: labelForTrigger('price-trigger', priceMeta),
      },
    },
    {
      id: lighterId,
      type: 'action',
      position: { x: 420, y: 40 },
      data: {
        type: 'action',
        kind: 'lighter',
        metadata: { side: 'long', leverage: 10, size: 1 },
        label: labelForAction('lighter', {
          side: 'long',
          leverage: 10,
          size: 1,
        }),
      },
    },
    {
      id: backpackId,
      type: 'action',
      position: { x: 420, y: 160 },
      data: {
        type: 'action',
        kind: 'backpack',
        metadata: { side: 'short', leverage: 2, size: 1 },
        label: labelForAction('backpack', {
          side: 'short',
          leverage: 2,
          size: 1,
        }),
      },
    },
    {
      id: hyperliquidId,
      type: 'action',
      position: { x: 420, y: 280 },
      data: {
        type: 'action',
        kind: 'hyperliquid',
        metadata: { side: 'short', leverage: 2, size: 1 },
        label: labelForAction('hyperliquid', {
          side: 'short',
          leverage: 2,
          size: 1,
        }),
      },
    },
  ]

  const edges: Edge[] = [
    { id: 'e-sol-lighter', source: triggerId, target: lighterId },
    { id: 'e-sol-backpack', source: triggerId, target: backpackId },
    { id: 'e-sol-hyperliquid', source: triggerId, target: hyperliquidId },
  ]

  return { nodes, edges }
}
