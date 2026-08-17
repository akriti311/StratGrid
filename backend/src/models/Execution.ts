import mongoose from 'mongoose'

export const EXECUTION_STATUSES = ['matched', 'no_match', 'error'] as const
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number]

export const EXECUTION_SOURCES = ['test-run', 'poller'] as const
export type ExecutionSource = (typeof EXECUTION_SOURCES)[number]

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

export type ExecutionDocument = {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  workflowId: mongoose.Types.ObjectId
  status: ExecutionStatus
  source: ExecutionSource
  triggerSnapshot: TriggerSnapshot
  actions: unknown[]
  createdAt: Date
  updatedAt: Date
}

const executionSchema = new mongoose.Schema<ExecutionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
    },
    status: { type: String, required: true, enum: EXECUTION_STATUSES },
    source: { type: String, required: true, enum: EXECUTION_SOURCES },
    triggerSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    actions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
)

executionSchema.index({ workflowId: 1, createdAt: -1 })
executionSchema.index({ userId: 1, createdAt: -1 })

export const Execution = mongoose.model<ExecutionDocument>(
  'Execution',
  executionSchema,
)
