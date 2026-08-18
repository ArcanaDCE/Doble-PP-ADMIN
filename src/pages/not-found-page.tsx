import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button.tsx'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Página no encontrada</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          La ruta solicitada no existe dentro del prototipo administrativo actual.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex">
          <Button>Volver al dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
