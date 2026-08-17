export type ExecutionStatus = 'matched' | 'no_match' | 'error'
export type ExecutionSource = 'test-run' | 'poller'

export type TriggerSnapshot = {
  nodeId: string
  kind: string
  label?: string
  observedPrice?: number
  reason: string
}

export type PaperActionLog = {
  nodeId: string
  kind: string
  side: string
  leverage: number
  size: number
  result: 'paper'
  message: string
}

export type ExecutionRecord = {
  id: string
  workflowId: string
  status: ExecutionStatus
  source: ExecutionSource
  triggerSnapshot: TriggerSnapshot
  actions: PaperActionLog[]
  createdAt: string
}
