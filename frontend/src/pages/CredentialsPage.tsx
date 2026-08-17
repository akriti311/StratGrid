import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteCredential,
  listCredentials,
  upsertCredential,
  type CredentialStatus,
  type CredentialVenue,
} from '@/lib/api'
import { VENUE_LABEL } from '@/lib/workflowGraph'

const VENUES: CredentialVenue[] = ['lighter', 'backpack', 'hyperliquid']

export function CredentialsPage() {
  const { user, logout } = useAuth()
  const [statuses, setStatuses] = useState<CredentialStatus[]>(
    VENUES.map((venue) => ({ venue, connected: false })),
  )
  const [venue, setVenue] = useState<CredentialVenue>('backpack')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function refresh() {
    const data = await listCredentials()
    setStatuses(data.credentials)
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load credentials')
    })
  }, [])

  async function handleSave() {
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      await upsertCredential(venue, apiKey, apiSecret)
      setApiKey('')
      setApiSecret('')
      setMessage(`${VENUE_LABEL[venue]} connected. Secret is stored encrypted and will not be shown again.`)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save credentials')
    } finally {
      setPending(false)
    }
  }

  async function handleDisconnect(target: CredentialVenue) {
    if (!window.confirm(`Disconnect ${VENUE_LABEL[target]}?`)) {
      return
    }
    setError(null)
    setMessage(null)
    try {
      await deleteCredential(target)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect')
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Credentials</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Workflows</Link>
            </Button>
            <Button variant="ghost" onClick={logout}>
              Log out
            </Button>
          </div>
        </header>

        <p className="text-sm text-muted-foreground">
          Paper Test run does not need these keys. They are stored encrypted so a later Live
          mode can place orders without showing secrets in the UI.
        </p>

        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <span
              key={item.venue}
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {VENUE_LABEL[item.venue]}:{' '}
              {item.connected ? 'connected' : 'not connected'}
            </span>
          ))}
        </div>

        <form
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue">Venue</Label>
            <select
              id="venue"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={venue}
              onChange={(event) => setVenue(event.target.value as CredentialVenue)}
            >
              {VENUES.map((item) => (
                <option key={item} value={item}>
                  {VENUE_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apiSecret">API secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(event) => setApiSecret(event.target.value)}
              autoComplete="off"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-foreground">{message}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save encrypted credentials'}
          </Button>
        </form>

        <ul className="flex flex-col gap-2">
          {statuses
            .filter((item) => item.connected)
            .map((item) => (
              <li
                key={item.venue}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2"
              >
                <span className="text-sm">{VENUE_LABEL[item.venue]} connected</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDisconnect(item.venue)}
                >
                  Disconnect
                </Button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
