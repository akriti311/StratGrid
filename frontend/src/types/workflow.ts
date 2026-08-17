import type { Node } from '@xyflow/react'

export type WorkflowNodeKind =
  | 'price-trigger'
  | 'timer-trigger'
  | 'hyperliquid'
  | 'backpack'
  | 'lighter'

/** Alias matching Harkirat's NodeKind naming */
export type NodeKind = WorkflowNodeKind

export type PriceTriggerMetadata = {
  asset: string
  operator: '<' | '>' | '<=' | '>='
  threshold: number
}

export type TimerTriggerMetadata = {
  minutes: number
}

export type TriggerMetadata = PriceTriggerMetadata | TimerTriggerMetadata

export type ActionKind = Extract<
  WorkflowNodeKind,
  'hyperliquid' | 'backpack' | 'lighter'
>

export type TradeSide = 'long' | 'short' | 'buy' | 'sell'

export type ActionMetadata = {
  side: TradeSide
  leverage: number
  size: number
}

export type NodeMetadata = TriggerMetadata | ActionMetadata

export type WorkflowNodeData = {
  type: 'action' | 'trigger'
  kind: WorkflowNodeKind
  metadata?: NodeMetadata
  label?: string
}

export type WorkflowNode = Node<WorkflowNodeData, 'trigger' | 'action'>
