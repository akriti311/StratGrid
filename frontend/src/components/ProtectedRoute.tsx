import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
