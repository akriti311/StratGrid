import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  isActionKind,
  isActionMetadata,
  isPriceTriggerMetadata,
  isTimerTriggerMetadata,
  VENUE_LABEL,
} from '@/lib/workflowGraph'
import type {
  ActionMetadata,
  PriceTriggerMetadata,
  TimerTriggerMetadata,
  TradeSide,
  WorkflowNode,
} from '@/types/workflow'

const OPERATORS: PriceTriggerMetadata['operator'][] = ['<', '>', '<=', '>=']
const SIDES: TradeSide[] = ['long', 'short', 'buy', 'sell']

type NodeConfigSheetProps = {
  node: WorkflowNode | null
  onOpenChange: (open: boolean) => void
  onUpdate: (nodeId: string, metadata: WorkflowNode['data']['metadata']) => void
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function PriceTriggerForm({
  metadata,
  onChange,
}: {
  metadata: PriceTriggerMetadata
  onChange: (metadata: PriceTriggerMetadata) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Field label="Asset">
        <Input
          value={metadata.asset}
          onChange={(event) =>
            onChange({ ...metadata, asset: event.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field label="Operator">
        <Select
          value={metadata.operator}
          onValueChange={(value) =>
            onChange({
              ...metadata,
              operator: value as PriceTriggerMetadata['operator'],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {operator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Threshold">
        <Input
          type="number"
          value={metadata.threshold}
          onChange={(event) =>
            onChange({
              ...metadata,
              threshold: Number(event.target.value),
            })
          }
        />
      </Field>
    </div>
  )
}

function TimerTriggerForm({
  metadata,
  onChange,
}: {
  metadata: TimerTriggerMetadata
  onChange: (metadata: TimerTriggerMetadata) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Field label="Every (minutes)">
        <Input
          type="number"
          min={1}
          value={metadata.minutes}
          onChange={(event) =>
            onChange({
              ...metadata,
              minutes: Number(event.target.value),
            })
          }
        />
      </Field>
    </div>
  )
}

function ActionForm({
  metadata,
  onChange,
}: {
  metadata: ActionMetadata
  onChange: (metadata: ActionMetadata) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Field label="Side">
        <Select
          value={metadata.side}
          onValueChange={(value) =>
            onChange({ ...metadata, side: value as TradeSide })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIDES.map((side) => (
              <SelectItem key={side} value={side}>
                {side.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Leverage">
        <Input
          type="number"
          min={1}
          value={metadata.leverage}
          onChange={(event) =>
            onChange({
              ...metadata,
              leverage: Number(event.target.value),
            })
          }
        />
      </Field>
      <Field label="Size">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={metadata.size}
          onChange={(event) =>
            onChange({
              ...metadata,
              size: Number(event.target.value),
            })
          }
        />
      </Field>
    </div>
  )
}

export function NodeConfigSheet({
  node,
  onOpenChange,
  onUpdate,
}: NodeConfigSheetProps) {
  const kind = node?.data.kind
  const title =
    node?.data.type === 'trigger'
      ? 'Edit trigger'
      : node && isActionKind(node.data.kind)
        ? `Edit ${VENUE_LABEL[node.data.kind]}`
        : 'Edit action'

  return (
    <Sheet open={node !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Change this node’s settings. The canvas label updates as you type.
          </SheetDescription>
        </SheetHeader>

        {node && kind === 'price-trigger' && isPriceTriggerMetadata(node.data.metadata) ? (
          <PriceTriggerForm
            metadata={node.data.metadata}
            onChange={(metadata) => onUpdate(node.id, metadata)}
          />
        ) : null}

        {node && kind === 'timer-trigger' && isTimerTriggerMetadata(node.data.metadata) ? (
          <TimerTriggerForm
            metadata={node.data.metadata}
            onChange={(metadata) => onUpdate(node.id, metadata)}
          />
        ) : null}

        {node && node.data.type === 'action' && isActionMetadata(node.data.metadata) ? (
          <ActionForm
            metadata={node.data.metadata}
            onChange={(metadata) => onUpdate(node.id, metadata)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
