import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [name, setName] = useState('Untitled workflow')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/credentials">Credentials</Link>
            </Button>
            <Button variant="ghost" onClick={logout}>
              Log out
            </Button>
          </div>
        </header>

        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="New workflow name"
          />
          <Button onClick={handleCreate} disabled={pending}>
            {pending ? 'Creating…' : 'Create'}
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {workflows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No workflows yet. Create one, use the SOL dip template, Save, then Enable so the
            background poller can paper-run it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {workflows.map((workflow) => (
              <li
                key={workflow.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {workflow.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {workflow.enabled ? 'Running (paper poller)' : 'Paused'} · updated{' '}
                    {new Date(workflow.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(workflow)}
                  >
                    {workflow.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(workflow.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
