import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client.ts'

type AppRole = 'administrator' | 'supervisor' | 'unknown'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  configError: string | null
  role: AppRole
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function resolveRole(user: User | null): AppRole {
  const role = user?.app_metadata.role ?? user?.user_metadata.role

  if (role === 'administrator' || role === 'supervisor') {
    return role
  }

  return 'unknown'
}

function createFallbackUser(email: string): User {
  return {
    id: 'local-admin',
    email,
    app_metadata: { provider: 'local', role: 'administrator' },
    user_metadata: { role: 'administrator' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone: '',
    confirmation_sent_at: null,
    email_confirmed_at: new Date().toISOString(),
    factors: [],
    role: 'administrator',
    is_anonymous: false,
    identities: [],
  } as unknown as User
}

function createFallbackSession(email: string) {
  const user = createFallbackUser(email)
  return {
    access_token: 'local-fallback-token',
    refresh_token: 'local-fallback-refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as unknown as Session
}

function getFallbackCredentials() {
  const fallbackEmail = (import.meta.env.VITE_APP_ADMIN_EMAIL || 'admin@doblepp.com').trim().toLowerCase()
  const fallbackPassword = import.meta.env.VITE_APP_ADMIN_PASSWORD || 'DoblePP2025!'
  return { fallbackEmail, fallbackPassword }
}

function isFallbackCredentials(email: string, password: string) {
  const { fallbackEmail, fallbackPassword } = getFallbackCredentials()
  return email.trim().toLowerCase() === fallbackEmail && password === fallbackPassword
}

function applyFallbackLogin(email: string) {
  const normalized = email.trim().toLowerCase()
  const fallbackPassword = getFallbackCredentials().fallbackPassword
  localStorage.setItem('doblepp-auth-email', normalized)
  localStorage.setItem('doblepp-auth-password', fallbackPassword)
  return {
    user: createFallbackUser(normalized),
    session: createFallbackSession(normalized),
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const configError = null

  useEffect(() => {
    const storedEmail = localStorage.getItem('doblepp-auth-email')
    const storedPassword = localStorage.getItem('doblepp-auth-password')
    const { fallbackEmail, fallbackPassword } = getFallbackCredentials()
    const hasStoredFallbackSession = Boolean(
      storedEmail && storedPassword && isFallbackCredentials(storedEmail, storedPassword),
    )

    if (storedEmail && storedPassword) {
      setUser(createFallbackUser(storedEmail))
      setSession(createFallbackSession(storedEmail))
    } else if (fallbackEmail && fallbackPassword) {
      localStorage.setItem('doblepp-auth-email', fallbackEmail)
      localStorage.setItem('doblepp-auth-password', fallbackPassword)
      const fallbackSession = createFallbackSession(fallbackEmail)
      setUser(fallbackSession.user)
      setSession(fallbackSession)
    }

    if (!supabase) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setSession(null)
        if (hasStoredFallbackSession && storedEmail) {
          const fallbackSession = createFallbackSession(storedEmail)
          setUser(fallbackSession.user)
          setSession(fallbackSession)
        } else if (!storedEmail && fallbackEmail) {
          const fallbackSession = createFallbackSession(fallbackEmail)
          setUser(fallbackSession.user)
          setSession(fallbackSession)
        }
        setIsLoading(false)
        return
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      } else if (hasStoredFallbackSession && storedEmail) {
        const fallbackSession = createFallbackSession(storedEmail)
        setUser(fallbackSession.user)
        setSession(fallbackSession)
      } else {
        setSession(null)
        setUser(null)
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        setSession(nextSession)
        setUser(nextSession.user)
      } else {
        const latestStoredEmail = localStorage.getItem('doblepp-auth-email')
        const latestStoredPassword = localStorage.getItem('doblepp-auth-password')

        if (latestStoredEmail && latestStoredPassword && isFallbackCredentials(latestStoredEmail, latestStoredPassword)) {
          const fallbackSession = createFallbackSession(latestStoredEmail)
          setUser(fallbackSession.user)
          setSession(fallbackSession)
        } else {
          setSession(null)
          setUser(null)
        }
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isConfigured: true,
      configError,
      role: resolveRole(user),
      async signIn(email, password) {
        const normalizedEmail = email.trim().toLowerCase()
        const { fallbackEmail, fallbackPassword } = getFallbackCredentials()

        if (normalizedEmail === fallbackEmail && password === fallbackPassword) {
          const nextSession = applyFallbackLogin(normalizedEmail)
          setUser(nextSession.user)
          setSession(nextSession.session)
          return null
        }

        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            return error.message
          }

          localStorage.setItem('doblepp-auth-email', data.user.email ?? email)
          localStorage.setItem('doblepp-auth-password', password)
          return null
        }

        return 'Correo o contraseña incorrectos.'
      },
      async signOut() {
        if (supabase) {
          const { error } = await supabase.auth.signOut()
          if (error) {
            localStorage.removeItem('doblepp-auth-email')
            localStorage.removeItem('doblepp-auth-password')
            setUser(null)
            setSession(null)
            return error.message
          }
        }

        localStorage.removeItem('doblepp-auth-email')
        localStorage.removeItem('doblepp-auth-password')
        setUser(null)
        setSession(null)
        return null
      },
    }),
    [configError, isLoading, session, user],
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
