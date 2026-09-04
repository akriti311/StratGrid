import { Grid3x3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  showTagline?: boolean
  linkTo?: string | false
}

export function BrandLogo({
  className,
  showTagline = false,
  linkTo = '/',
}: BrandLogoProps) {
  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
        <Grid3x3 className="size-4 text-primary" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Strat<span className="text-primary">Grid</span>
        </span>
        {showTagline ? (
          <span className="text-xs text-muted-foreground">
            Visual trading workflows
          </span>
        ) : null}
      </div>
    </div>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}
