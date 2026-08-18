import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(value: string | undefined) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return trimmedValue
  }

  if (trimmedValue.includes('.supabase.com')) {
    return trimmedValue.replace('.supabase.com', '.supabase.co')
  }

  return trimmedValue
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export function getSupabaseConfigError() {
  if (!supabaseUrl && !supabasePublishableKey) {
    return 'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno local.'
  }

  if (!supabaseUrl) {
    return 'Falta VITE_SUPABASE_URL en el entorno local.'
  }

  if (!supabasePublishableKey) {
    return 'Falta VITE_SUPABASE_ANON_KEY en el entorno local.'
  }

  return null
}

export const supabase =
  getSupabaseConfigError() === null
    ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null
