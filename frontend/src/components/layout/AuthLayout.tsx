import { ArrowRightLeft, Shield, Zap } from 'lucide-react'

import { BrandLogo } from '@/components/BrandLogo'

type AuthLayoutProps = {
  children: React.ReactNode
  title: string
  description: string
}

const FEATURES = [
  {
    icon: Zap,
    title: 'When → Then rules',
    description: 'Draw price triggers and multi-venue actions on a canvas.',
  },
  {
    icon: Shield,
    title: 'Paper-first safety',
    description: 'Test strategies with simulated orders before going live.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Multi-venue hedges',
    description: 'Fan out one trigger to Lighter, Backpack, and Hyperliquid.',
  },
] as const

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="app-grid-bg flex min-h-screen">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-border/60 bg-card/40 p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5" />
        <div className="relative">
          <BrandLogo showTagline linkTo={false} />
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
              Automate your
              <br />
              <span className="text-gradient">crypto strategies</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Build visual workflows that watch the market and paper-run trades
              across perp venues — no bot code required.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <li key={feature.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {feature.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Paper mode only · No live orders
        </p>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 lg:hidden">
          <BrandLogo showTagline />
        </div>

        <div className="glass-panel w-full max-w-md rounded-2xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
