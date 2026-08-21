import { BellRing, Palette, Shield, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'

export function SettingsPage() {
  const { settings: storedSettings, updateSettings, addActivity } = useAppData()
  const [settings, setSettings] = useState(storedSettings)
  const [saveMessage, setSaveMessage] = useState('')
  const { notifySuccess } = useFeedback()

  useEffect(() => {
    setSettings(storedSettings)
  }, [storedSettings])

  function updateField<K extends keyof typeof storedSettings>(key: K, value: (typeof storedSettings)[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function handleSave() {
    updateSettings(settings)
    addActivity({
      user: 'Administrador',
      action: 'Se actualizó la configuración general',
      module: 'Configuración',
      record: settings.companyName,
      createdAt: new Date().toISOString(),
    })
    setSaveMessage('Configuración guardada correctamente.')
    window.setTimeout(() => setSaveMessage(''), 2200)
    notifySuccess('Configuración guardada', 'Los ajustes quedaron listos para la operación diaria.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes globales del sistema para seguridad, alertas, identidad visual y operación diaria."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Seguridad y accesos</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <label className="flex items-center justify-between gap-3">
                  <span>Requiere aprobación de cambios críticos</span>
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(event) => updateField('requireApproval', event.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Recordatorio de sesión activa</span>
                  <input
                    type="checkbox"
                    checked={settings.sessionReminder}
                    onChange={(event) => updateField('sessionReminder', event.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
              <Palette className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Identidad visual</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Nombre de la empresa</label>
                  <input
                    value={settings.companyName}
                    onChange={(event) => updateField('companyName', event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Color principal</label>
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(event) => updateField('primaryColor', event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 p-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Alertas y notificaciones</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <label className="flex items-center justify-between gap-3">
                  <span>Alertas por bajo stock</span>
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlert}
                    onChange={(event) => updateField('lowStockAlert', event.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Resumen diario por correo</span>
                  <input
                    type="checkbox"
                    checked={settings.dailySummaryEmail}
                    onChange={(event) => updateField('dailySummaryEmail', event.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Preferencias operativas</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Moneda por defecto</label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(event) => updateField('defaultCurrency', event.target.value as typeof settings.defaultCurrency)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Zona horaria</label>
                  <select
                    value={settings.defaultTimezone}
                    onChange={(event) => updateField('defaultTimezone', event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  >
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Venta requerida por X</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.commissionRuleAmount}
                    onChange={(event) => updateField('commissionRuleAmount', Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Ganancia por X</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.commissionRuleBonus}
                    onChange={(event) => updateField('commissionRuleBonus', Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Límite mensual de gastos</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.expenseMonthlyLimit}
                    onChange={(event) => updateField('expenseMonthlyLimit', Number(event.target.value))}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-300">{saveMessage || 'Los cambios se guardan de forma local y quedan listos para operar en esta instalación.'}</p>
        <Button onClick={handleSave}>Guardar cambios</Button>
      </div>
    </div>
  )
}
