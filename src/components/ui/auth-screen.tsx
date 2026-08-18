type AuthScreenProps = {
  title: string
  description: string
}

export function AuthScreen({ title, description }: AuthScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">
          Doble PP Company
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">{description}</p>
      </div>
    </div>
  )
}
