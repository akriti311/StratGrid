import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { WorkflowNode } from '@/types/workflow'

export function TriggerNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div
      className={cn(
        'min-w-44 rounded-lg border-2 bg-card px-3 py-2 shadow-sm',
        selected ? 'border-primary' : 'border-sky-500/70',
      )}
    >
      <p className="text-[10px] font-medium tracking-wide text-sky-700 uppercase">
        When · Trigger
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{data.label}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !bg-sky-600"
      />
    </div>
  )
}
