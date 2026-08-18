import { useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const movementTypes = ['Deuda', 'Pago de deuda', 'Ahorro', 'Retiro de ahorro', 'Ajuste']

const defaultForm = {
  employeeId: '',
  type: 'Ahorro',
  amount: '0',
  description: '',
  admin: 'Administrador',
}

export function FinancePage() {
  const { employees, financeMovements, addFinanceMovement, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState(defaultForm)

  const filteredMovements = useMemo(() => {
    return financeMovements.filter((row) => {
      const rowDate = new Date(row.createdAt).toISOString().slice(0, 10)
      const matchesFrom = !fromDate || rowDate >= fromDate
      const matchesTo = !toDate || rowDate <= toDate
      const matchesEmployee = employeeFilter === 'all' || row.employeeId === employeeFilter
      const matchesType = typeFilter === 'all' || row.type === typeFilter
      return matchesFrom && matchesTo && matchesEmployee && matchesType
    })
  }, [employeeFilter, financeMovements, fromDate, toDate, typeFilter])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.employeeId || Number(form.amount) <= 0) {
      notifyError('Movimiento incompleto', 'Selecciona un empleado y un monto válido.')
      return
    }

    const employee = employees.find((item) => item.id === form.employeeId)
    if (!employee) {
      notifyError('Empleado no disponible', 'Selecciona nuevamente al empleado antes de guardar el movimiento.')
      return
    }

    addFinanceMovement({
      employeeId: employee.id,
      employeeName: employee.name,
      type: form.type as 'Deuda' | 'Pago de deuda' | 'Ahorro' | 'Retiro de ahorro' | 'Ajuste',
      amount: Number(form.amount),
      description: form.description || 'Sin descripción',
      admin: form.admin,
      createdAt: new Date().toISOString(),
    })
    addActivity({
      user: form.admin,
      action: `Se registró un movimiento de ${form.type.toLowerCase()}`,
      module: 'Deudas y ahorros',
      record: `${employee.name} (${form.amount})`,
      createdAt: new Date().toISOString(),
    })
    setForm(defaultForm)
    notifySuccess('Movimiento guardado', `${employee.name} quedó actualizado en deudas y ahorros.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deudas y ahorros"
        description="Movimientos reales con cálculo automático de saldo, sin campos mágicos ni montos manuales."
      />

      <SectionCard title="Registrar movimiento" description="Registra deudas, pagos, ahorros o retiros para cada empleado.">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
            <select value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
              <option value="">Selecciona</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
              {movementTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Monto</label>
            <input type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-500" placeholder="$0.00" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Administrador</label>
            <input value={form.admin} onChange={(event) => setForm((current) => ({ ...current, admin: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-500" placeholder="Motivo del movimiento" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Guardar movimiento</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Movimientos registrados" description="Filtra por empleado, tipo o rango de fechas.">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" type="date" />
          <input value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" type="date" />
          <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
            <option value="all">Todos los empleados</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
            <option value="all">Todos los tipos</option>
            {movementTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay movimientos registrados con esos filtros.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    {['Empleado', 'Tipo', 'Monto', 'Fecha', 'Descripción', 'Administrador'].map((header) => (
                      <th key={header} className="px-4 py-4 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-white/5">
                  {filteredMovements.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-4 text-sm text-white">{row.employeeName}</td>
                      <td className="px-4 py-4"><StatusBadge label={row.type} tone={row.type === 'Deuda' || row.type === 'Retiro de ahorro' ? 'danger' : row.type === 'Ahorro' || row.type === 'Pago de deuda' ? 'success' : 'info'} /></td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{row.description}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{row.admin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
