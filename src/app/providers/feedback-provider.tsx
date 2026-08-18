import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { cn } from '../../lib/utils/cn.ts'

type FeedbackTone = 'success' | 'error' | 'info'

type FeedbackItem = {
  id: string
  tone: FeedbackTone
  title: string
  description?: string
}

type FeedbackContextValue = {
  notifySuccess: (title: string, description?: string) => void
  notifyError: (title: string, description?: string) => void
  notifyInfo: (title: string, description?: string) => void
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined)

const toneClasses: Record<FeedbackTone, string> = {
  success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50',
  error: 'border-rose-400/20 bg-rose-500/10 text-rose-50',
  info: 'border-sky-400/20 bg-sky-500/10 text-sky-50',
}

const toneIcons: Record<FeedbackTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

function createId() {
  return `feedback_${Math.random().toString(36).slice(2, 10)}`
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const timers = useRef(new Map<string, number>())

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timeoutId = timers.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timers.current.delete(id)
    }
  }

  const pushItem = (tone: FeedbackTone, title: string, description?: string) => {
    const id = createId()
    setItems((current) => [{ id, tone, title, description }, ...current].slice(0, 3))
    const timeoutId = window.setTimeout(() => removeItem(id), 3600)
    timers.current.set(id, timeoutId)
  }

  const value = useMemo<FeedbackContextValue>(
    () => ({
      notifySuccess: (title, description) => pushItem('success', title, description),
      notifyError: (title, description) => pushItem('error', title, description),
      notifyInfo: (title, description) => pushItem('info', title, description),
    }),
    [],
  )

  useEffect(() => {
    return () => {
      for (const timeoutId of timers.current.values()) {
        window.clearTimeout(timeoutId)
      }
      timers.current.clear()
    }
  }, [])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(100%-2rem,24rem)] flex-col gap-3">
        {items.map((item) => {
          const Icon = toneIcons[item.tone]
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl',
                toneClasses[item.tone],
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-6 text-white/80">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar notificación"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback debe usarse dentro de FeedbackProvider')
  }
  return context
}
