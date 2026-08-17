import type { NodeTypes } from '@xyflow/react'

import { ActionNode } from '@/components/nodes/ActionNode'
import { TriggerNode } from '@/components/nodes/TriggerNode'

export const workflowNodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
} satisfies NodeTypes
