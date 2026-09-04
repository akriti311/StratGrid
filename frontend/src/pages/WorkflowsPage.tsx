import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  GitBranch,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  setWorkflowEnabled,
  type SavedWorkflow,
} from '@/lib/api'

export function WorkflowsPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [name, setName] = useState('Untitled workflow')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const runningCount = workflows.filter((workflow) => workflow.enabled).length

  async function refresh() {
    const data = await listWorkflows()
    setWorkflows(data.workflows)
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    })
  }, [])

  async function handleCreate() {
    setPending(true)
    setError(null)
    try {
      const data = await createWorkflow({ name: name.trim() || 'Untitled workflow' })
      navigate(`/workflows/${data.workflow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create workflow')
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this workflow?')) {
      return
    }
    setError(null)
    try {
      await deleteWorkflow(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  async function handleToggle(workflow: SavedWorkflow) {
    setError(null)
    try {
      await setWorkflowEnabled(workflow.id, !workflow.enabled)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update enabled')
    }
  }

  return (
    <AppShell
      title="Workflows"
      description="Design when-then rules, paper-test them, and enable the background poller."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total workflows" value={String(workflows.length)} />
        <StatCard label="Running (paper)" value={String(runningCount)} accent />
        <StatCard label="Mode" value="Paper only" />
      </div>

      <div className="glass-panel mb-6 rounded-2xl p-4">
        <p className="mb-3 text-sm font-medium text-foreground">New workflow</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="e.g. SOL dip hedge"
            className="h-10 flex-1"
          />
          <Button onClick={handleCreate} disabled={pending} className="h-10 gap-1.5">
            <Plus className="size-4" />
            {pending ? 'Creating…' : 'Create workflow'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {workflows.length === 0 ? (
        <div className="glass-panel flex flex-col items-center rounded-2xl border-dashed px-6 py-16 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
            <GitBranch className="size-7 text-primary" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">No workflows yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create a workflow, load the SOL dip template, save it, then enable
            Running so the poller can paper-run it in the background.
          </p>
          <Button
            className="mt-6 gap-1.5"
            onClick={handleCreate}
            disabled={pending}
          >
            <Sparkles className="size-4" />
            Create your first workflow
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {workflows.map((workflow) => (
            <li
              key={workflow.id}
              className="glass-panel group rounded-2xl p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="text-base font-semibold text-foreground transition-colors group-hover:text-primary"
                    >
                      {workflow.name}
                    </Link>
                    <Badge variant={workflow.enabled ? 'success' : 'secondary'}>
                      {workflow.enabled ? 'Running' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(workflow.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/workflows/${workflow.id}`}>
                      Open
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant={workflow.enabled ? 'secondary' : 'default'}
                    size="sm"
                    className="gap-1"
                    onClick={() => handleToggle(workflow)}
                  >
                    <Play className="size-3.5" />
                    {workflow.enabled ? 'Pause' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(workflow.id)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only sm:not-sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="glass-panel rounded-xl px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={
          accent
            ? 'mt-1 text-2xl font-semibold text-primary'
            : 'mt-1 text-2xl font-semibold text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}
