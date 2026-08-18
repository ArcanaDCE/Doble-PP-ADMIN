import { cn } from '../../lib/utils/cn.ts'

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  danger: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
  info: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  neutral: 'border-white/10 bg-white/5 text-slate-200',
}

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
  className?: string
}

export function StatusBadge({
  label,
  tone = 'neutral',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}
