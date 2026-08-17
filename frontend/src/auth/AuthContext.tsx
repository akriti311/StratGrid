import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  clearToken,
  fetchMe,
  getStoredToken,
  login as loginRequest,
  signup as signupRequest,
  storeToken,
  type AuthUser,
} from '@/lib/api'

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setReady(true)
      return
    }

    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    function onUnauthorized() {
      setUser(null)
    }
    window.addEventListener('stratgrid-unauthorized', onUnauthorized)
    return () => {
      window.removeEventListener('stratgrid-unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password)
    storeToken(data.token)
    setUser(data.user)
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    const data = await signupRequest(email, password)
    storeToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, signup, logout }),
    [user, ready, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
