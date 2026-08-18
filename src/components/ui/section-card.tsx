import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from 'react'
import { cn } from '../../lib/utils/cn.ts'

type SectionCardProps = PropsWithChildren<{
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
}> &
  Omit<ComponentPropsWithoutRef<'section'>, 'className' | 'children'>

export function SectionCard({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <section
      {...props}
      className={cn(
        'rounded-[28px] border border-white/10 bg-slate-900/65 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-6',
        className,
      )}
    >
      {title || description || actions ? (
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
