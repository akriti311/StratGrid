import mongoose from 'mongoose'

export type TriggerState = Record<string, { lastFiredAt: string }>

export type WorkflowDocument = {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string
  enabled: boolean
  nodes: unknown[]
  edges: unknown[]
  triggerState: TriggerState
  createdAt: Date
  updatedAt: Date
}

const workflowSchema = new mongoose.Schema<WorkflowDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, required: true, default: false },
    nodes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    edges: { type: [mongoose.Schema.Types.Mixed], default: [] },
    triggerState: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

workflowSchema.index({ userId: 1, enabled: 1 })
workflowSchema.index({ enabled: 1 })

export const Workflow = mongoose.model<WorkflowDocument>('Workflow', workflowSchema)
