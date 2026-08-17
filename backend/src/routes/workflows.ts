import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { getSolPrice } from '../lib/demoPrice'
import { runPaperWorkflow } from '../lib/paperRun'
import { requireAuth } from '../middleware/auth'
import { Execution } from '../models/Execution'
import { Workflow } from '../models/Workflow'

export const workflowRouter = Router()

workflowRouter.use(requireAuth)

const graphSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
})

function publicWorkflow(workflow: {
  _id: { toString(): string }
  name: string
  enabled: boolean
  nodes: unknown[]
  edges: unknown[]
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: workflow._id.toString(),
    name: workflow.name,
    enabled: workflow.enabled,
    nodes: workflow.nodes,
    edges: workflow.edges,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  }
}

function publicExecution(execution: {
  _id: { toString(): string }
  workflowId: { toString(): string }
  status: string
  source: string
  triggerSnapshot: unknown
  actions: unknown[]
  createdAt: Date
}) {
  return {
    id: execution._id.toString(),
    workflowId: execution.workflowId.toString(),
    status: execution.status,
    source: execution.source,
    triggerSnapshot: execution.triggerSnapshot,
    actions: execution.actions,
    createdAt: execution.createdAt.toISOString(),
  }
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function ownerQuery(userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) {
    return null
  }
  return { _id: id, userId }
}

workflowRouter.get('/', async (req, res) => {
  const workflows = await Workflow.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
  res.json({ workflows: workflows.map(publicWorkflow) })
})

workflowRouter.post('/', async (req, res) => {
  const parsed = graphSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return
  }

  const workflow = await Workflow.create({
    userId: req.userId,
    name: parsed.data.name ?? 'Untitled workflow',
    enabled: parsed.data.enabled ?? false,
    nodes: parsed.data.nodes ?? [],
    edges: parsed.data.edges ?? [],
  })

  res.status(201).json({ workflow: publicWorkflow(workflow) })
})

workflowRouter.get('/:id', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const workflow = await Workflow.findOne(query)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  res.json({ workflow: publicWorkflow(workflow) })
})

workflowRouter.put('/:id', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const parsed = graphSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return
  }

  const workflow = await Workflow.findOneAndUpdate(
    query,
    {
      $set: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.nodes !== undefined ? { nodes: parsed.data.nodes } : {}),
        ...(parsed.data.edges !== undefined ? { edges: parsed.data.edges } : {}),
      },
    },
    { new: true },
  )

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  res.json({ workflow: publicWorkflow(workflow) })
})

workflowRouter.patch('/:id/enabled', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'enabled must be a boolean' })
    return
  }

  const workflow = await Workflow.findOneAndUpdate(
    query,
    {
      $set: {
        enabled: parsed.data.enabled,
        ...(parsed.data.enabled ? { triggerState: {} } : {}),
      },
    },
    { new: true },
  )

  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  res.json({ workflow: publicWorkflow(workflow) })
})

workflowRouter.delete('/:id', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const result = await Workflow.findOneAndDelete(query)
  if (!result) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  await Execution.deleteMany({ workflowId: result._id, userId: req.userId })
  res.json({ ok: true })
})

workflowRouter.post('/:id/test-run', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const workflow = await Workflow.findOne(query)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const solPrice = await getSolPrice(req.userId!)
  const ran = runPaperWorkflow({
    nodes: workflow.nodes,
    edges: workflow.edges,
    source: 'test-run',
    solPrice,
  })

  if (!ran.ok) {
    res.status(400).json({ error: ran.errors[0], errors: ran.errors })
    return
  }

  const execution = await Execution.create({
    userId: req.userId,
    workflowId: workflow._id,
    status: ran.result.status,
    source: ran.result.source,
    triggerSnapshot: ran.result.triggerSnapshot,
    actions: ran.result.actions,
  })

  res.status(201).json({ execution: publicExecution(execution) })
})

workflowRouter.get('/:id/executions', async (req, res) => {
  const query = ownerQuery(req.userId!, routeParam(req.params.id))
  if (!query) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const workflow = await Workflow.findOne(query)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  const limitParsed = z.coerce.number().int().min(1).max(50).safeParse(req.query.limit)
  const limit = limitParsed.success ? limitParsed.data : 20

  const executions = await Execution.find({
    workflowId: workflow._id,
    userId: req.userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)

  res.json({ executions: executions.map(publicExecution) })
})
