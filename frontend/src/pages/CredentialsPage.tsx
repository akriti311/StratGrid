import { useEffect, useState } from 'react'
import { CheckCircle2, Link2, ShieldCheck, Unplug } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
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
  const [statuses, setStatuses] = useState<CredentialStatus[]>(
    VENUES.map((venue) => ({ venue, connected: false })),
  )
  const [venue, setVenue] = useState<CredentialVenue>('backpack')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const connectedCount = statuses.filter((item) => item.connected).length

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
      setMessage(
        `${VENUE_LABEL[venue]} connected. Secret is stored encrypted and will not be shown again.`,
      )
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
    <AppShell
      title="Credentials"
      description="Store encrypted API keys for a future live mode. Paper runs do not need them."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="glass-panel rounded-xl px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Connected venues
          </p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {connectedCount} / {VENUES.length}
          </p>
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-xl px-4 py-3">
          <ShieldCheck className="size-8 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Keys are encrypted with AES-256-GCM and never shown again after save.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Badge
            key={item.venue}
            variant={item.connected ? 'success' : 'secondary'}
            className="gap-1.5 px-3 py-1 normal-case"
          >
            {item.connected ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <Unplug className="size-3" />
            )}
            {VENUE_LABEL[item.venue]}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="glass-panel flex flex-col gap-4 rounded-2xl p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Connect a venue</h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue">Venue</Label>
            <select
              id="venue"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
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
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-auto">
            {pending ? 'Saving…' : 'Save encrypted credentials'}
          </Button>
        </form>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground">Active connections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Disconnect a venue to remove its stored keys.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {statuses.filter((item) => item.connected).length === 0 ? (
              <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No venues connected yet.
              </li>
            ) : (
              statuses
                .filter((item) => item.connected)
                .map((item) => (
                  <li
                    key={item.venue}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-background/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span className="text-sm font-medium">
                        {VENUE_LABEL[item.venue]}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(item.venue)}
                    >
                      Disconnect
                    </Button>
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  )
}
