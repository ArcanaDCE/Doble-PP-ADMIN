import type { AppData } from './app-data.ts'

const REMOTE_ROW_ID = 'main'

function getSupabaseConfig() {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  const url = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  return { url, anonKey }
}

export function hasRemoteAppDataConfig() {
  const { url, anonKey } = getSupabaseConfig()
  return Boolean(url && anonKey)
}

type FetchRemoteAppDataResult = {
  data: AppData | null
  error: string | null
}

export async function fetchRemoteAppData(): Promise<FetchRemoteAppDataResult> {
  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) {
    return { data: null, error: null }
  }

  const endpoint = `${url}/rest/v1/app_state?id=eq.${REMOTE_ROW_ID}&select=payload&limit=1`
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const details = await response.text()
    return {
      data: null,
      error: `No se pudo leer el estado remoto (${response.status}). ${details.slice(0, 140)}`,
    }
  }

  const rows = (await response.json()) as Array<{ payload?: AppData }>
  const payload = rows[0]?.payload
  if (!payload) {
    return { data: null, error: null }
  }

  return { data: payload, error: null }
}

export async function saveRemoteAppData(data: AppData): Promise<string | null> {
  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) {
    return null
  }

  const endpoint = `${url}/rest/v1/app_state?on_conflict=id`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        id: REMOTE_ROW_ID,
        payload: data,
      },
    ]),
  })

  if (!response.ok) {
    const details = await response.text()
    return `No se pudo guardar el estado remoto (${response.status}). ${details.slice(0, 140)}`
  }

  return null
}
