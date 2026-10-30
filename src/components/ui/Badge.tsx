import { clsx } from 'clsx'

export interface BadgeProps {
  children: React.ReactNode
  variant?: string
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const base = 'badge'
  const variants: Record<string, string> = {
    info: 'badge-info',
    warning: 'badge-warning',
    critical: 'badge-critical',
    success: 'badge-success',
    default: 'bg-gray-100 text-gray-800',
  }
  return <span className={clsx(base, variants[variant] || variants.default, className)}>{children}</span>
}
