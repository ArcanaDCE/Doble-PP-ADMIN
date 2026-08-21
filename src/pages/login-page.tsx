import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { Button } from '../components/ui/button.tsx'

function normalizeAuthError(errorMessage: string) {
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }

  return errorMessage
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useAppData()
  const { configError, isConfigured, signIn } = useAuth()
  const quickAccessEmail = (import.meta.env.VITE_APP_ADMIN_EMAIL || 'admin@doblepp.com').trim().toLowerCase()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(quickAccessEmail)
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null
    return state?.from?.pathname ?? '/dashboard'
  }, [location.state])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail || !password) {
      setErrorMessage('Ingresa tu correo y contraseña.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    const responseError = await signIn(normalizedEmail, password)

    if (responseError) {
      setErrorMessage(normalizeAuthError(responseError))
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1800px] items-stretch xl:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-white/10 xl:flex xl:flex-col xl:justify-between xl:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-300">
              Sistema privado
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight text-white">
              {settings.companyName}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Plataforma administrativa interna para controlar empleados, productos, inventario, ventas, pagos y operación financiera con una experiencia moderna y profesional.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Privada', 'Acceso exclusivo para usuarios autorizados'],
              ['Responsive', 'Optimizada para escritorio, tablet y móvil'],
              ['Escalable', 'Lista para roles, auditoría y reportes'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-[520px] rounded-[32px] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-amber-300 text-xl font-black text-slate-950">
                DP
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                  Acceso administrativo
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Iniciar sesión</h2>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-200" />
                <p className="text-sm leading-7 text-sky-50/90">
                  Acceso interno simple y privado. Esta pantalla valida la sesión local y redirige al dashboard después del login.
                </p>
              </div>
            </div>

            {configError ? (
              <div className="mt-4 rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-7 text-rose-100">
                {configError}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-7 text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Usuario o correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="admin@doblepp.com"
                  autoComplete="email"
                  disabled={!isConfigured || isSubmitting}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Contraseña</label>
                <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 pr-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={!isConfigured || isSubmitting}
                  />
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={!isConfigured || isSubmitting}>
                <LockKeyhole className="h-4 w-4" />
                {isSubmitting ? 'Validando acceso...' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="mt-5 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-50/90">
              Publicación simple: solo necesitas definir correo y contraseña del administrador en Netlify para que el sistema quede listo.
            </div>

            <div className="mt-6 text-sm text-slate-400">
              Este sistema es privado. No existe registro público desde la aplicación.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
