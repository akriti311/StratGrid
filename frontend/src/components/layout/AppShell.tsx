import { KeyRound, LogOut, Workflow } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
}

const NAV_ITEMS = [
  { to: '/', label: 'Workflows', icon: Workflow },
  { to: '/credentials', label: 'Credentials', icon: KeyRound },
] as const

export function AppShell({
  children,
  title,
  description,
  actions,
}: AppShellProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="app-grid-bg min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo showTagline linkTo="/" />

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {title ? (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
