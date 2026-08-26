import { Navigate, Outlet } from 'react-router-dom'
import { getDefaultRouteForRole, type AppRole, useAuth } from '../../app/providers/auth-provider.tsx'

type RoleRouteProps = {
  allowedRoles: AppRole[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { role, session } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return <Outlet />
}
