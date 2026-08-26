import { Navigate, Outlet } from 'react-router-dom'
import { getDefaultRouteForRole, useAuth } from '../../app/providers/auth-provider.tsx'
import { AuthScreen } from './auth-screen.tsx'

export function PublicOnlyRoute() {
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
    return <Navigate to={getDefaultRouteForRole(session.user.role)} replace />
  }

  return <Outlet />
}
