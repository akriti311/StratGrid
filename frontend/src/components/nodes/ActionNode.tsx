import { ArrowLeftRight } from 'lucide-react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import { VENUE_LABEL } from '@/lib/workflowGraph'
import { cn } from '@/lib/utils'
import type { ActionKind, WorkflowNode } from '@/types/workflow'

export function ActionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const kind = data.kind as ActionKind
  const venue = VENUE_LABEL[kind] ?? kind

  return (
    <div
      className={cn(
        'min-w-[200px] overflow-hidden rounded-xl border bg-card shadow-lg transition-shadow',
        selected
          ? 'border-amber-400 shadow-amber-500/20 ring-2 ring-amber-400/40'
          : 'border-amber-500/40 shadow-black/20',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-card !bg-amber-400"
      />
      <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/20">
          <ArrowLeftRight className="size-3.5 text-amber-300" />
        </span>
        <p className="text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
          Then · {venue}
        </p>
      </div>
      <p className="px-3 py-2.5 text-sm font-medium text-foreground">{data.label}</p>
    </div>
  )
}
