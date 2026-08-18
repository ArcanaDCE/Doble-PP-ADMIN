import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn.ts'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-400 text-slate-950 shadow-lg shadow-sky-950/25 hover:bg-sky-300 focus-visible:outline-sky-300',
  secondary:
    'border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10 focus-visible:outline-slate-400',
  ghost:
    'bg-transparent text-slate-200 hover:bg-white/5 hover:text-white focus-visible:outline-slate-400',
  danger:
    'bg-rose-500 text-white shadow-lg shadow-rose-950/25 hover:bg-rose-400 focus-visible:outline-rose-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-2xl px-4 text-sm',
  lg: 'h-12 rounded-2xl px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = 'button', variant = 'primary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})
