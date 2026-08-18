type StatCardProps = {
  label: string
  value: string
  trend: string
  accent?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
  badge?: string
}

const accentClasses = {
  sky: 'from-sky-400/15 to-sky-400/5 text-sky-200',
  emerald: 'from-emerald-400/15 to-emerald-400/5 text-emerald-200',
  amber: 'from-amber-400/15 to-amber-400/5 text-amber-200',
  rose: 'from-rose-400/15 to-rose-400/5 text-rose-200',
  violet: 'from-violet-400/15 to-violet-400/5 text-violet-200',
}

export function StatCard({
  label,
  value,
  trend,
  accent = 'sky',
  badge = 'Estable',
}: StatCardProps) {
  return (
    <article
      className={`rounded-[26px] border border-white/10 bg-gradient-to-br ${accentClasses[accent]} p-5 shadow-xl shadow-slate-950/15`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {badge}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{trend}</p>
    </article>
  )
}
