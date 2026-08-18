import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/auth-provider.tsx'
import { AuthScreen } from './auth-screen.tsx'

export function PublicOnlyRoute() {
  const location = useLocation()
  const { isLoading, session } = useAuth()

  if (isLoading) {
    return (
      <AuthScreen
        title="Preparando acceso"
        description="Estamos revisando si ya tienes una sesión activa para enviarte al panel correcto."
      />
    )
  }

  if (session) {
    const state = location.state as { from?: { pathname?: string } } | null
    const redirectTo = state?.from?.pathname ?? '/dashboard'

    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
