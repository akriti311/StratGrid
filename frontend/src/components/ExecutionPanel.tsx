import { useEffect, useState } from 'react'
import { Activity, FlaskConical, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  fetchHealth,
  getMarketSol,
  listExecutions,
  setMarketSol,
  testRunWorkflow,
  type ExecutionRecord,
} from '@/lib/api'

const DEFAULT_SOL = 148
const MIN_SOL = 1
const MAX_SOL = 500

type ExecutionPanelProps = {
  workflowId: string
  enabled: boolean
  canRun: boolean
  saveGraph: () => Promise<boolean>
}

export function ExecutionPanel({
  workflowId,
  enabled,
  canRun,
  saveGraph,
}: ExecutionPanelProps) {
  const [price, setPrice] = useState(DEFAULT_SOL)
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [intervalMs, setIntervalMs] = useState(10_000)
  const [cooldownMs, setCooldownMs] = useState(60_000)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    Promise.all([getMarketSol(), listExecutions(workflowId), fetchHealth()])
      .then(([market, history, health]) => {
        if (cancelled) {
          return
        }
        setPrice(market.price)
        setExecutions(history.executions)
        if (health.poller?.intervalMs) {
          setIntervalMs(health.poller.intervalMs)
        }
        if (health.poller?.priceCooldownMs) {
          setCooldownMs(health.poller.priceCooldownMs)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load paper engine')
        }
      })

    return () => {
      cancelled = true
    }
  }, [workflowId])

  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false

    async function refreshHistory() {
      try {
        const history = await listExecutions(workflowId)
        if (!cancelled) {
          setExecutions(history.executions)
        }
      } catch {
        // Keep the last timeline if a background refresh fails.
      }
    }

    void refreshHistory()
    const timer = window.setInterval(() => {
      void refreshHistory()
    }, Math.max(intervalMs, 3000))

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enabled, workflowId, intervalMs])

  async function persistPrice(next: number) {
    if (!Number.isFinite(next)) {
      return
    }
    const clamped = Math.min(MAX_SOL, Math.max(MIN_SOL, next))
    setPrice(clamped)
    try {
      const saved = await setMarketSol(clamped)
      setPrice(saved.price)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save SOL price')
    }
  }

  async function handleTestRun() {
    if (!canRun) {
      return
    }
    setError(null)
    setRunning(true)
    try {
      const saved = await saveGraph()
      if (!saved) {
        return
      }
      await setMarketSol(price)
      const { execution } = await testRunWorkflow(workflowId)
      setExecutions((current) => [execution, ...current.filter((item) => item.id !== execution.id)].slice(0, 20))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test run failed')
    } finally {
      setRunning(false)
    }
  }

  const priceBelowThreshold = price < 150

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <FlaskConical className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Paper engine</p>
            <p className="text-xs text-muted-foreground">Simulated orders only</p>
          </div>
        </div>
        <Badge variant={enabled ? 'success' : 'secondary'}>
          {enabled ? 'Poller on' : 'Poller off'}
        </Badge>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {enabled
          ? `Checks every ${formatDuration(intervalMs)}. Price triggers cooldown ${formatDuration(cooldownMs)} between fires.`
          : 'Enable Running on the toolbar to let the background poller evaluate this workflow.'}
      </p>

      <div className="mt-4 rounded-xl border border-border/80 bg-background/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <Label htmlFor="demo-sol-price" className="text-xs">
            Demo SOL price
          </Label>
          <span
            className={
              priceBelowThreshold
                ? 'text-xs font-medium text-emerald-400'
                : 'text-xs font-medium text-muted-foreground'
            }
          >
            ${price.toFixed(1)}
          </span>
        </div>
        <Input
          id="demo-sol-price"
          type="number"
          min={MIN_SOL}
          max={MAX_SOL}
          step="0.5"
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
          onBlur={() => {
            if (Number.isFinite(price)) {
              void persistPrice(price)
            }
          }}
          className="mb-2 h-9"
        />
        <input
          type="range"
          min={MIN_SOL}
          max={MAX_SOL}
          step={1}
          value={Number.isFinite(price) ? price : DEFAULT_SOL}
          aria-label="Demo SOL price"
          className="w-full accent-primary"
          onChange={(event) => setPrice(Number(event.target.value))}
          onPointerUp={(event) => {
            const next = Number((event.target as HTMLInputElement).value)
            if (Number.isFinite(next)) {
              void persistPrice(next)
            }
          }}
        />
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {priceBelowThreshold
            ? 'Below $150 — SOL dip template would match'
            : 'Above $150 — dip trigger would not match'}
        </p>
      </div>

      <Button
        className="mt-3 w-full gap-1.5"
        onClick={() => void handleTestRun()}
        disabled={!canRun || running}
      >
        <PlayCircle className="size-4" />
        {running ? 'Running…' : 'Test run now'}
      </Button>
      {!canRun ? (
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Fix the graph validation errors first.
        </p>
      ) : null}

      {error || loadError ? (
        <p className="mt-2 text-xs text-destructive">{error ?? loadError}</p>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Activity className="size-3.5" />
          Run history
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {executions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No runs yet. Test run evaluates immediately.
            </p>
          ) : (
            executions.map((execution) => (
              <article
                key={execution.id}
                className="rounded-lg border border-border/80 bg-background/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="normal-case">
                    {execution.source === 'test-run' ? 'Test' : 'Poller'}
                  </Badge>
                  <StatusBadge status={execution.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(execution.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                  {execution.triggerSnapshot.reason}
                </p>
                {execution.actions.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 border-t border-border/60 pt-1.5">
                    {execution.actions.map((action) => (
                      <li
                        key={`${execution.id}-${action.nodeId}`}
                        className="text-[11px] text-muted-foreground"
                      >
                        → {action.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ExecutionRecord['status'] }) {
  if (status === 'matched') {
    return <Badge variant="success">Matched</Badge>
  }
  if (status === 'no_match') {
    return <Badge variant="secondary">No match</Badge>
  }
  return <Badge variant="destructive">Error</Badge>
}

function formatDuration(ms: number): string {
  if (ms % 60_000 === 0) {
    const minutes = ms / 60_000
    return minutes === 1 ? '1 min' : `${minutes} min`
  }
  if (ms % 1000 === 0) {
    return `${ms / 1000}s`
  }
  return `${ms}ms`
}
