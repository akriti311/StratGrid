import { useEffect, useState } from 'react'

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

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">Paper engine</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Simulated orders only. No live trades.
        {enabled
          ? ` Poller checks every ${formatDuration(intervalMs)}; price triggers wait ${formatDuration(cooldownMs)} between automatic runs.`
          : ' Enable the workflow (Running) to let the background poller fire it.'}
      </p>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor="demo-sol-price">Demo SOL price</Label>
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
      </div>

      <Button
        className="mt-3 w-full"
        onClick={() => void handleTestRun()}
        disabled={!canRun || running}
      >
        {running ? 'Running…' : 'Test run'}
      </Button>
      {!canRun ? (
        <p className="mt-1 text-xs text-muted-foreground">Fix the graph, then test run.</p>
      ) : null}

      {error || loadError ? (
        <p className="mt-2 text-xs text-destructive">{error ?? loadError}</p>
      ) : null}

      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
        {executions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No runs yet. Test run evaluates now. Enable the workflow so the poller can fire while SOL stays below 150.
          </p>
        ) : (
          executions.map((execution) => (
            <article
              key={execution.id}
              className="rounded-md border border-border bg-background/80 px-2 py-1.5"
            >
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                {execution.source === 'test-run' ? 'Test run' : 'Poller'} ·{' '}
                {statusLabel(execution.status)} ·{' '}
                {new Date(execution.createdAt).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-foreground">
                {execution.triggerSnapshot.reason}
              </p>
              {execution.actions.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {execution.actions.map((action) => (
                    <li key={`${execution.id}-${action.nodeId}`}>{action.message}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  )
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

function statusLabel(status: ExecutionRecord['status']): string {
  if (status === 'matched') {
    return 'Matched'
  }
  if (status === 'no_match') {
    return 'No match'
  }
  return 'Error'
}
