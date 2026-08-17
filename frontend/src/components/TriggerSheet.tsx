import { Clock, TrendingDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type {
  NodeKind,
  TriggerMetadata,
} from '@/types/workflow'

type TriggerOption = {
  kind: Extract<NodeKind, 'price-trigger' | 'timer-trigger'>
  title: string
  description: string
  icon: typeof TrendingDown
  metadata: TriggerMetadata
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    kind: 'price-trigger',
    title: 'Price trigger',
    description: 'Fire when an asset crosses a price (e.g. SOL < 150)',
    icon: TrendingDown,
    metadata: {
      asset: 'SOL',
      operator: '<',
      threshold: 150,
    },
  },
  {
    kind: 'timer-trigger',
    title: 'Timer trigger',
    description: 'Fire on an interval (e.g. every 5 minutes)',
    icon: Clock,
    metadata: {
      minutes: 5,
    },
  },
]

type TriggerSheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect: (kind: NodeKind, metadata: TriggerMetadata) => void
}

export function TriggerSheet({
  open,
  onOpenChange,
  onSelect,
}: TriggerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>Add trigger</Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add a trigger</SheetTitle>
          <SheetDescription>
            Choose when this workflow should start running.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4 pb-4">
          {TRIGGER_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.kind}
                type="button"
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                onClick={() => {
                  onSelect(option.kind, option.metadata)
                  onOpenChange?.(false)
                }}
              >
                <span className="mt-0.5 rounded-md border border-border bg-background p-2">
                  <Icon className="size-4" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {option.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
