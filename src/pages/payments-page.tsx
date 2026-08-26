import { Landmark, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const defaultForm = {
  employeeId: '',
  amount: '0',
  concept: '',
  period: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export function PaymentsPage() {
  const { employees, payments, addPayment, addActivity } = useAppData()
  const { role, user } = useAuth()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)

  const sellerEmployeeId = role === 'seller' ? user?.employeeId : undefined

  useEffect(() => {
    if (sellerEmployeeId) {
      setForm((current) => ({ ...current, employeeId: sellerEmployeeId }))
    }
  }, [sellerEmployeeId])

  const employeeOptions = sellerEmployeeId
    ? employees.filter((employee) => employee.id === sellerEmployeeId)
    : employees

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.employeeId || Number(form.amount) <= 0 || !form.concept.trim()) {
      notifyError('Pago incompleto', 'Selecciona empleado, concepto y monto válido.')
      return
    }

    const employee = employees.find((item) => item.id === form.employeeId)
    if (!employee) {
      notifyError('Empleado no disponible', 'Recarga la lista de empleados e intenta nuevamente.')
      return
    }

    addPayment({
      employeeId: employee.id,
      employeeName: employee.name,
      amount: Number(form.amount),
      concept: form.concept,
      period: form.period || 'Sin periodo',
      date: form.date,
      notes: form.notes,
    })

    addActivity({
      user: 'Administrador',
      action: 'Se registró un pago',
      module: 'Pagos',
      record: `${employee.name} (${form.concept})`,
      createdAt: new Date().toISOString(),
    })
    setForm(defaultForm)
    notifySuccess('Pago registrado', `${employee.name} recibió un pago de ${formatCurrency(Number(form.amount))}.`)
  }

  const totalPagado = payments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos a empleados"
        description="Registra salarios, comisiones, bonos, adelantos y cualquier pago al personal con trazabilidad en el historial."
        actions={
          <a href="#payment-form" className="inline-flex">
            <Button>
              <Plus className="h-4 w-4" />
              Registrar pago
            </Button>
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total pagado" value={formatCurrency(totalPagado)} trend="Acumulado" accent="emerald" />
        <StatCard label="Pagos del mes" value={String(payments.length)} trend="Registros" accent="amber" />
        <StatCard label="Último corte" value={payments[0]?.date ? formatDateTime(payments[0].date) : 'Sin registros'} trend="Historial" accent="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard id="payment-form" title="Registrar pago" description="Formulario simple y claro para registrar pagos reales.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
              <select value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none" disabled={role === 'seller'}>
                <option value="">Selecciona</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Concepto</label>
              <input value={form.concept} onChange={(event) => setForm((current) => ({ ...current, concept: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Salario, comisión..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Monto</label>
              <input type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Periodo</label>
              <input value={form.period} onChange={(event) => setForm((current) => ({ ...current, period: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Semana 1" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Fecha</label>
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Notas opcionales" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Guardar pago</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Historial reciente" description="Listado de pagos relacionados con el personal.">
          {payments.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No hay pagos registrados todavía. Cuando registres el primero, aparecerá aquí.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{payment.employeeName}</p>
                      <p className="mt-1 text-sm text-slate-400">{payment.period} · {payment.concept}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      <Landmark className="h-3.5 w-3.5" />
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{payment.date}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
