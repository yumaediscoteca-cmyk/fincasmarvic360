import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const maxWidthClass = {
  narrow: 'max-w-2xl',
  standard: 'max-w-3xl',
  wide: 'max-w-4xl',
  xl: 'max-w-5xl',
  full: 'max-w-7xl',
} as const

export type PageShellMaxWidth = keyof typeof maxWidthClass

function Root({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background text-foreground flex flex-col', className)}>
      {children}
    </div>
  )
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-page-header w-full border-b border-border bg-card/95 backdrop-blur-md text-foreground',
        'pt-[max(0.25rem,env(safe-area-inset-top,0px))]',
        className,
      )}
    >
      {children}
    </header>
  )
}

function Main({
  children,
  maxWidth = 'standard',
  className,
}: {
  children: ReactNode
  maxWidth?: PageShellMaxWidth
  className?: string
}) {
  return (
    <main
      className={cn(
        'flex-1 w-full mx-auto overflow-y-auto',
        maxWidthClass[maxWidth],
        className,
      )}
    >
      {children}
    </main>
  )
}

export const PageShell = { Root, Header, Main }
