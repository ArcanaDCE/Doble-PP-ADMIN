import { getDefaultAppData, type AppData } from './app-data.ts'

const REMOTE_ROW_ID = 'main'
const REMOTE_TIMEOUT_MS = 8000

function normalizeRemotePayload(payload: Partial<AppData> | null | undefined): AppData {
  const base = getDefaultAppData()

  if (!payload) {
    return base
  }

  return {
    ...base,
    ...payload,
    settings: {
      ...base.settings,
      ...(payload.settings ?? {}),
    },
    users: payload.users ?? base.users,
    employees: payload.employees ?? base.employees,
    products: payload.products ?? base.products,
    vehicles: payload.vehicles ?? base.vehicles,
    vehicleMovements: payload.vehicleMovements ?? base.vehicleMovements,
    inventoryMovements: payload.inventoryMovements ?? base.inventoryMovements,
    employeeStocks: payload.employeeStocks ?? base.employeeStocks,
    employeeStockMovements: payload.employeeStockMovements ?? base.employeeStockMovements,
    cuts: payload.cuts ?? base.cuts,
    expenses: payload.expenses ?? base.expenses,
    sales: payload.sales ?? base.sales,
    payments: payload.payments ?? base.payments,
    financeMovements: payload.financeMovements ?? base.financeMovements,
    activity: payload.activity ?? base.activity,
  }
}

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

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)
    const endpoint = `${url}/rest/v1/app_state?id=eq.${REMOTE_ROW_ID}&select=payload&limit=1`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)

    if (!response.ok) {
      const details = await response.text()
      return {
        data: null,
        error: `No se pudo leer el estado remoto (${response.status}). ${details.slice(0, 140)}`,
      }
    }

    const rows = (await response.json()) as Array<{ payload?: Partial<AppData> }>
    const payload = rows[0]?.payload

    if (!payload || Object.keys(payload).length === 0) {
      return { data: null, error: null }
    }

    return { data: normalizeRemotePayload(payload), error: null }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error && error.name === 'AbortError'
          ? 'La conexión con Supabase tardó demasiado.'
          : `No se pudo conectar con Supabase. ${error instanceof Error ? error.message : ''}`.trim(),
    }
  }
}

export async function saveRemoteAppData(data: AppData): Promise<string | null> {
  const { url, anonKey } = getSupabaseConfig()

  if (!url || !anonKey) {
    return null
  }

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS)
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
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)

    if (!response.ok) {
      const details = await response.text()
      return `No se pudo guardar el estado remoto (${response.status}). ${details.slice(0, 140)}`
    }

    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Se agotó el tiempo al guardar en Supabase.'
    }

    return `No se pudo guardar en Supabase. ${error instanceof Error ? error.message : ''}`.trim()
  }
}
