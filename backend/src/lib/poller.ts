import { config } from '../config'
import { getSolPrice } from './demoPrice'
import { runPaperWorkflow } from './paperRun'
import { stampFiredTriggers } from './triggerState'
import { Execution } from '../models/Execution'
import { Workflow } from '../models/Workflow'

let ticking = false

export async function pollOnce(): Promise<{ scanned: number; fired: number }> {
  if (ticking) {
    return { scanned: 0, fired: 0 }
  }
  ticking = true
  let scanned = 0
  let fired = 0

  try {
    const workflows = await Workflow.find({ enabled: true })
    scanned = workflows.length
    const now = new Date()

    for (const workflow of workflows) {
      try {
        const solPrice = await getSolPrice(workflow.userId.toString())
        const ran = runPaperWorkflow({
          nodes: workflow.nodes,
          edges: workflow.edges,
          source: 'poller',
          solPrice,
          now: now.getTime(),
          triggerState: workflow.triggerState,
          priceCooldownMs: config.priceCooldownMs,
        })

        if (!ran.ok) {
          console.warn(
            `Poller skipped ${workflow._id.toString()} (${workflow.name}): ${ran.errors[0]}`,
          )
          continue
        }

        if (ran.result.status !== 'matched') {
          continue
        }

        await Execution.create({
          userId: workflow.userId,
          workflowId: workflow._id,
          status: ran.result.status,
          source: ran.result.source,
          triggerSnapshot: ran.result.triggerSnapshot,
          actions: ran.result.actions,
        })

        await Workflow.updateOne(
          { _id: workflow._id },
          {
            $set: {
              triggerState: stampFiredTriggers(
                workflow.triggerState,
                ran.result.firedTriggerIds,
                now,
              ),
            },
          },
          { timestamps: false },
        )
        fired += 1
      } catch (error) {
        console.error(`Poller failed on workflow ${workflow._id.toString()}`, error)
      }
    }
  } finally {
    ticking = false
  }

  return { scanned, fired }
}

export function startPoller(): NodeJS.Timeout {
  console.log(
    `Paper poller every ${config.pollIntervalMs / 1000}s; price cooldown ${config.priceCooldownMs / 1000}s`,
  )
  void pollOnce()
  return setInterval(() => {
    void pollOnce()
  }, config.pollIntervalMs)
}
