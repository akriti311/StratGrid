import { ArrowLeftRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { ActionKind, ActionMetadata } from '@/types/workflow'

type ActionOption = {
  kind: ActionKind
  title: string
  description: string
  metadata: ActionMetadata
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    kind: 'lighter',
    title: 'Lighter',
    description: 'Place a trade on lighter.xyz (e.g. LONG 10x)',
    metadata: {
      side: 'long',
      leverage: 10,
      size: 1,
    },
  },
  {
    kind: 'backpack',
    title: 'Backpack',
    description: 'Place a trade on backpack.exchange (e.g. SHORT 2x)',
    metadata: {
      side: 'short',
      leverage: 2,
      size: 1,
    },
  },
  {
    kind: 'hyperliquid',
    title: 'Hyperliquid',
    description: 'Place a trade on Hyperliquid (e.g. SHORT 2x)',
    metadata: {
      side: 'short',
      leverage: 2,
      size: 1,
    },
  },
]

type ActionSheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect: (kind: ActionKind, metadata: ActionMetadata) => void
}

export function ActionSheet({
  open,
  onOpenChange,
  onSelect,
}: ActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowLeftRight className="size-3.5" />
          Add action
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="border-border/80 bg-popover sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add an action</SheetTitle>
          <SheetDescription>
            Choose where to place a trade when the trigger fires.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4 pb-4">
          {ACTION_OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
              onClick={() => {
                onSelect(option.kind, option.metadata)
                onOpenChange?.(false)
              }}
            >
              <span className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/15 p-2">
                <ArrowLeftRight className="size-4 text-amber-300" />
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
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
