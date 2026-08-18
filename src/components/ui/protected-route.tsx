import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/auth-provider.tsx'
import { AuthScreen } from './auth-screen.tsx'

export function ProtectedRoute() {
  const location = useLocation()
  const { isLoading, session } = useAuth()

  if (isLoading) {
    return (
      <AuthScreen
        title="Validando sesión"
        description="Estamos comprobando tu acceso seguro a la plataforma administrativa."
      />
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
