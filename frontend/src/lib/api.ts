import type { ExecutionRecord } from '@/types/execution'

const TOKEN_KEY = 'stratgrid_token'

export type AuthUser = {
  id: string
  email: string
}

type AuthResponse = {
  token: string
  user: AuthUser
}

type MeResponse = {
  user: AuthUser
}

type ErrorBody = {
  error?: string
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody
    return body.error ?? `Request failed (${response.status})`
  } catch {
    if (response.status === 502) {
      return 'Cannot reach the API. Start the backend with: cd backend && npm run dev'
    }
    return `Request failed (${response.status})`
  }
}

function notifyUnauthorized(): void {
  clearToken()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stratgrid-unauthorized'))
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, { ...options, headers })
  } catch {
    throw new Error(
      'Cannot reach the API. Start the backend with: cd backend && npm run dev',
    )
  }

  if (
    response.status === 401 &&
    token &&
    !path.startsWith('/api/auth/login') &&
    !path.startsWith('/api/auth/signup')
  ) {
    notifyUnauthorized()
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as T
}

export function signup(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/auth/me')
}

export type PollerHealth = {
  intervalMs: number
  priceCooldownMs: number
}

export function fetchHealth(): Promise<{ ok: boolean; poller?: PollerHealth }> {
  return apiRequest('/api/health')
}

export type SavedWorkflow = {
  id: string
  name: string
  enabled: boolean
  nodes: unknown[]
  edges: unknown[]
  createdAt: string
  updatedAt: string
}

export function listWorkflows(): Promise<{ workflows: SavedWorkflow[] }> {
  return apiRequest('/api/workflows')
}

export function createWorkflow(body: {
  name?: string
  enabled?: boolean
  nodes?: unknown[]
  edges?: unknown[]
}): Promise<{ workflow: SavedWorkflow }> {
  return apiRequest('/api/workflows', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getWorkflow(id: string): Promise<{ workflow: SavedWorkflow }> {
  return apiRequest(`/api/workflows/${id}`)
}

export function updateWorkflow(
  id: string,
  body: {
    name?: string
    enabled?: boolean
    nodes?: unknown[]
    edges?: unknown[]
  },
): Promise<{ workflow: SavedWorkflow }> {
  return apiRequest(`/api/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function setWorkflowEnabled(
  id: string,
  enabled: boolean,
): Promise<{ workflow: SavedWorkflow }> {
  return apiRequest(`/api/workflows/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

export function deleteWorkflow(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/workflows/${id}`, { method: 'DELETE' })
}

export type CredentialVenue = 'lighter' | 'backpack' | 'hyperliquid'

export type CredentialStatus = {
  venue: CredentialVenue
  connected: boolean
}

export function listCredentials(): Promise<{ credentials: CredentialStatus[] }> {
  return apiRequest('/api/credentials')
}

export function upsertCredential(
  venue: CredentialVenue,
  apiKey: string,
  apiSecret: string,
): Promise<{ venue: CredentialVenue; connected: boolean }> {
  return apiRequest(`/api/credentials/${venue}`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey, apiSecret }),
  })
}

export function deleteCredential(venue: CredentialVenue): Promise<{ ok: boolean }> {
  return apiRequest(`/api/credentials/${venue}`, { method: 'DELETE' })
}

export type MarketSol = {
  symbol: 'SOL' | string
  price: number
  defaultPrice?: number
  updatedAt?: string
}

export function getMarketSol(): Promise<MarketSol> {
  return apiRequest('/api/market/sol')
}

export function setMarketSol(price: number): Promise<MarketSol> {
  return apiRequest('/api/market/sol', {
    method: 'PUT',
    body: JSON.stringify({ price }),
  })
}

export type {
  ExecutionRecord,
  PaperActionLog,
  TriggerSnapshot,
} from '@/types/execution'

export function testRunWorkflow(
  id: string,
): Promise<{ execution: ExecutionRecord }> {
  return apiRequest(`/api/workflows/${id}/test-run`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function listExecutions(
  id: string,
  limit = 20,
): Promise<{ executions: ExecutionRecord[] }> {
  return apiRequest(`/api/workflows/${id}/executions?limit=${limit}`)
}
