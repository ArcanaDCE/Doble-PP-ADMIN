import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { loadAppData } from '../../lib/app-data.ts'
import { fetchRemoteAppData, hasRemoteAppDataConfig } from '../../lib/remote-app-data.ts'

export type AppRole = 'administrator' | 'supervisor' | 'employee' | 'seller'

export type AuthUser = {
  id: string
  email: string
  role: AppRole
  name: string
  employeeId?: string
}

export type AuthSession = {
  token: string
  createdAt: string
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isConfigured: boolean
  configError: string | null
  role: AppRole
  signIn: (email: string, password: string) => Promise<{ error: string | null; redirectTo?: string }>
  signOut: () => Promise<string | null>
}

const SESSION_STORAGE_KEY = 'doble-pp-auth-session'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getConfiguredCredentials() {
  const email = (import.meta.env.VITE_APP_ADMIN_EMAIL || '').trim().toLowerCase()
  const password = import.meta.env.VITE_APP_ADMIN_PASSWORD || ''
  const name = (import.meta.env.VITE_APP_ADMIN_NAME || 'Administrador principal').trim()

  return { email, password, name }
}

function createSession(email: string, name: string): AuthSession {
  return {
    token: `local_${Math.random().toString(36).slice(2, 12)}`,
    createdAt: new Date().toISOString(),
    user: {
      id: 'local-admin',
      email: email.trim().toLowerCase(),
      role: 'administrator',
      name,
    },
  }
}

function createUserSession(user: {
  id: string
  email: string
  role: AppRole
  name: string
  employeeId?: string
}): AuthSession {
  return {
    token: `local_${Math.random().toString(36).slice(2, 12)}`,
    createdAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email.trim().toLowerCase(),
      role: user.role,
      name: user.name,
      employeeId: user.employeeId,
    },
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.user?.email || !parsed?.token) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function getDefaultRouteForRole(role: AppRole) {
  if (role === 'administrator') {
    return '/admin'
  }

  if (role === 'supervisor') {
    return '/inventory'
  }

  return '/my-space'
}

function getLocalUsers() {
  return loadAppData().users
}

async function getUsersForAuthentication() {
  const localUsers = getLocalUsers()
  if (!hasRemoteAppDataConfig()) {
    return localUsers
  }

  const remoteResult = await fetchRemoteAppData()
  if (remoteResult.error) {
    console.error(remoteResult.error)
    return localUsers
  }

  if (!remoteResult.data) {
    return localUsers
  }

  const remoteUsers = Array.isArray(remoteResult.data.users) ? remoteResult.data.users : localUsers
  return remoteUsers.length > 0 ? remoteUsers : localUsers
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSession(readStoredSession())
    setIsLoading(false)
  }, [])

  const { email: configuredEmail, password: configuredPassword, name: configuredName } = getConfiguredCredentials()
  const localUsers = getLocalUsers()
  const hasLocalCredentials = localUsers.some((user) => user.status === 'Activo' && Boolean(user.password))
  const isConfigured = Boolean((configuredEmail && configuredPassword) || hasLocalCredentials || hasRemoteAppDataConfig())
  const configError = isConfigured
    ? null
    : 'Faltan credenciales. Configura el administrador en Netlify o crea usuarios locales con contraseña.'

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isConfigured,
      configError,
      role: session?.user.role ?? 'administrator',
      async signIn(email, password) {
        try {
          if (!isConfigured) {
            return { error: configError }
          }

          const normalizedEmail = email.trim().toLowerCase()
          if (normalizedEmail === configuredEmail && password === configuredPassword) {
            const nextSession = createSession(normalizedEmail, configuredName)
            persistSession(nextSession)
            setSession(nextSession)
            return { error: null, redirectTo: getDefaultRouteForRole(nextSession.user.role) }
          }

          const availableUsers = await getUsersForAuthentication()
          const matchedUser = (availableUsers ?? []).find(
            (user) =>
              user.status === 'Activo' &&
              user.email.trim().toLowerCase() === normalizedEmail &&
              user.password === password,
          )

          if (!matchedUser) {
            return { error: 'Correo o contraseña incorrectos.' }
          }

          const nextSession = createUserSession({
            id: matchedUser.id,
            email: matchedUser.email,
            role: matchedUser.role,
            name: matchedUser.name,
            employeeId: matchedUser.employeeId,
          })
          persistSession(nextSession)
          setSession(nextSession)
          return { error: null, redirectTo: getDefaultRouteForRole(nextSession.user.role) }
        } catch (error) {
          console.error(error)
          return { error: 'No se pudo validar el acceso. Revisa tu conexión e intenta de nuevo.' }
        }
      },
      async signOut() {
        persistSession(null)
        setSession(null)
        return null
      },
    }),
    [configError, configuredEmail, configuredName, configuredPassword, isConfigured, isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { getDefaultRouteForRole }

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
