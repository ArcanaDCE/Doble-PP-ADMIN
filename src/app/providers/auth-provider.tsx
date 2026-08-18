import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type AppRole = 'administrator' | 'supervisor'

export type AuthUser = {
  id: string
  email: string
  role: AppRole
  name: string
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
  signIn: (email: string, password: string) => Promise<string | null>
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

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSession(readStoredSession())
    setIsLoading(false)
  }, [])

  const { email: configuredEmail, password: configuredPassword, name: configuredName } = getConfiguredCredentials()
  const isConfigured = Boolean(configuredEmail && configuredPassword)
  const configError = isConfigured
    ? null
    : 'Faltan VITE_APP_ADMIN_EMAIL y VITE_APP_ADMIN_PASSWORD. Configúralas antes de publicar.'

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isConfigured,
      configError,
      role: session?.user.role ?? 'administrator',
      async signIn(email, password) {
        if (!isConfigured) {
          return configError
        }

        const normalizedEmail = email.trim().toLowerCase()
        if (normalizedEmail !== configuredEmail || password !== configuredPassword) {
          return 'Correo o contraseña incorrectos.'
        }

        const nextSession = createSession(normalizedEmail, configuredName)
        persistSession(nextSession)
        setSession(nextSession)
        return null
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
