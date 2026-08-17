import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { WorkflowNode } from '@/types/workflow'

export function ActionNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div
      className={cn(
        'min-w-44 rounded-lg border-2 bg-card px-3 py-2 shadow-sm',
        selected ? 'border-primary' : 'border-amber-500/70',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !bg-amber-600"
      />
      <p className="text-[10px] font-medium tracking-wide text-amber-700 uppercase">
        Then · Action
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{data.label}</p>
    </div>
  )
}
