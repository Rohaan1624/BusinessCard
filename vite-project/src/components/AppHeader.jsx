import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'

export default function AppHeader({ to = '/', label = 'CardForge', children }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to={to} className="flex items-center gap-2 font-bold text-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-4" />
          </span>
          {label}
        </Link>
        <nav className="flex items-center gap-2">{children}</nav>
      </div>
    </header>
  )
}
