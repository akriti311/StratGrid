import { Clock, TrendingDown } from 'lucide-react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import { cn } from '@/lib/utils'
import type { WorkflowNode } from '@/types/workflow'

export function TriggerNode({ data, selected }: NodeProps<WorkflowNode>) {
  const isTimer = data.kind === 'timer-trigger'

  return (
    <div
      className={cn(
        'min-w-[200px] overflow-hidden rounded-xl border bg-card shadow-lg transition-shadow',
        selected
          ? 'border-sky-400 shadow-sky-500/20 ring-2 ring-sky-400/40'
          : 'border-sky-500/40 shadow-black/20',
      )}
    >
      <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/10 px-3 py-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-sky-500/20">
          {isTimer ? (
            <Clock className="size-3.5 text-sky-300" />
          ) : (
            <TrendingDown className="size-3.5 text-sky-300" />
          )}
        </span>
        <p className="text-[10px] font-semibold tracking-wider text-sky-300 uppercase">
          When · Trigger
        </p>
      </div>
      <p className="px-3 py-2.5 text-sm font-medium text-foreground">{data.label}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-card !bg-sky-400"
      />
    </div>
  )
}
