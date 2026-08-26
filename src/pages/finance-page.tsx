import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const movementTypes = ['Deuda', 'Pago de deuda', 'Ahorro', 'Retiro de ahorro', 'Ajuste']

const defaultForm = {
  employeeId: '',
  type: 'Ahorro',
  amount: '0',
  description: '',
  admin: 'Administrador',
}

const defaultExpenseForm = {
  employeeId: '',
  concept: '',
  amount: '0',
  notes: '',
  admin: 'Administrador',
}

export function FinancePage() {
  const { employees, financeMovements, expenses, settings, addFinanceMovement, addExpense, updateExpenseStatus, addActivity } = useAppData()
  const { role, user } = useAuth()
  const { notifySuccess, notifyError } = useFeedback()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState(defaultForm)
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm)
  const [expenseFilter, setExpenseFilter] = useState('all')

  const sellerEmployeeId = role === 'seller' ? user?.employeeId : undefined
  const employeeOptions = sellerEmployeeId
    ? employees.filter((employee) => employee.id === sellerEmployeeId)
    : employees

  useEffect(() => {
    if (sellerEmployeeId) {
      setEmployeeFilter(sellerEmployeeId)
      setForm((current) => ({ ...current, employeeId: sellerEmployeeId }))
      setExpenseForm((current) => ({ ...current, employeeId: sellerEmployeeId }))
    }
  }, [sellerEmployeeId])

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((row) => {
      const rowDate = new Date(row.createdAt).toISOString().slice(0, 10)
      const matchesFrom = !fromDate || rowDate >= fromDate
      const matchesTo = !toDate || rowDate <= toDate
      const matchesEmployee = employeeFilter === 'all' || row.employeeId === employeeFilter
      const matchesStatus = expenseFilter === 'all' || row.status === expenseFilter
      return matchesFrom && matchesTo && matchesEmployee && matchesStatus
    })
  }, [employeeFilter, expenses, expenseFilter, fromDate, toDate])

  const expenseMonthKey = new Date().toISOString().slice(0, 7)
  const approvedThisMonth = expenses
    .filter((expense) => expense.status === 'Aprobado' && expense.createdAt.slice(0, 7) === expenseMonthKey)
    .reduce((sum, expense) => sum + expense.amount, 0)
  const pendingExpenses = expenses.filter((expense) => expense.status === 'Pendiente').length
  const approvedExpenses = expenses.filter((expense) => expense.status === 'Aprobado').length
  const remainingExpenseLimit = Math.max(settings.expenseMonthlyLimit - approvedThisMonth, 0)

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

  function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!expenseForm.employeeId || !expenseForm.concept.trim() || Number(expenseForm.amount) <= 0) {
      notifyError('Gasto incompleto', 'Selecciona un empleado, concepto y monto válido.')
      return
    }

    const employee = employees.find((item) => item.id === expenseForm.employeeId)
    if (!employee) {
      notifyError('Empleado no disponible', 'Selecciona nuevamente al empleado antes de guardar el gasto.')
      return
    }

    const errorMessage = addExpense({
      employeeId: employee.id,
      employeeName: employee.name,
      concept: expenseForm.concept.trim(),
      amount: Number(expenseForm.amount),
      notes: expenseForm.notes.trim(),
      admin: expenseForm.admin,
    })

    if (errorMessage) {
      notifyError('No se pudo guardar el gasto', errorMessage)
      return
    }

    addActivity({
      user: expenseForm.admin,
      action: 'Se registró un gasto',
      module: 'Gastos',
      record: `${employee.name} (${expenseForm.amount})`,
      createdAt: new Date().toISOString(),
    })

    setExpenseForm(defaultExpenseForm)
    notifySuccess(
      'Gasto registrado',
      Number(expenseForm.amount) > remainingExpenseLimit
        ? 'El gasto quedó pendiente de aprobación por exceder el límite mensual.'
        : 'El gasto quedó registrado y aprobado.',
    )
  }

  function handleExpenseStatus(expenseId: string, status: 'Pendiente' | 'Aprobado' | 'Rechazado') {
    const errorMessage = updateExpenseStatus(expenseId, status, 'Administrador')
    if (errorMessage) {
      notifyError('No se pudo actualizar el gasto', errorMessage)
      return
    }

    addActivity({
      user: 'Administrador',
      action: `Se ${status === 'Aprobado' ? 'aprobó' : 'rechazó'} un gasto`,
      module: 'Gastos',
      record: expenseId,
      createdAt: new Date().toISOString(),
    })

    notifySuccess('Gasto actualizado', `El gasto quedó en estado ${status.toLowerCase()}.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deudas y ahorros"
        description="Movimientos reales con cálculo automático de saldo y control de gastos con límite mensual."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Límite de gastos" value={formatCurrency(settings.expenseMonthlyLimit)} trend="Mensual" accent="sky" />
        <StatCard label="Gastos aprobados" value={String(approvedExpenses)} trend={formatCurrency(approvedThisMonth)} accent="emerald" />
        <StatCard label="Gastos pendientes" value={String(pendingExpenses)} trend="En autorización" accent="amber" />
        <StatCard label="Disponible" value={formatCurrency(remainingExpenseLimit)} trend="Restante del mes" accent="violet" />
      </div>

      <SectionCard title="Registrar movimiento" description="Registra deudas, pagos, ahorros o retiros para cada empleado.">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <SectionCard title="Gastos autorizados" description="Si el gasto supera el límite mensual, queda pendiente de aprobación.">
        <form onSubmit={handleExpenseSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
            <select
              value={expenseForm.employeeId}
              onChange={(event) => setExpenseForm((current) => ({ ...current, employeeId: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              disabled={role === 'seller'}
            >
              <option value="">Selecciona</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Concepto</label>
            <input
              value={expenseForm.concept}
              onChange={(event) => setExpenseForm((current) => ({ ...current, concept: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              placeholder="Gasolina, recarga, etc."
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Monto</label>
            <input
              type="number"
              min="0"
              value={expenseForm.amount}
              onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Administrador</label>
            <input
              value={expenseForm.admin}
              onChange={(event) => setExpenseForm((current) => ({ ...current, admin: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
            <input
              value={expenseForm.notes}
              onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              placeholder="Observaciones del gasto"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Guardar gasto</Button>
          </div>
        </form>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">Filtrar gastos por estado.</p>
          <select
            value={expenseFilter}
            onChange={(event) => setExpenseFilter(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
          >
            <option value="all">Todos</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Aprobado">Aprobados</option>
            <option value="Rechazado">Rechazados</option>
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No hay gastos registrados con esos filtros.
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{expense.concept}</p>
                    <p className="mt-1 text-sm text-slate-400">{expense.employeeName} · {expense.admin}</p>
                  </div>
                  <StatusBadge
                    label={expense.status}
                    tone={expense.status === 'Aprobado' ? 'success' : expense.status === 'Pendiente' ? 'warning' : 'danger'}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Monto</p>
                    <p className="mt-1 font-medium text-white">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fecha</p>
                    <p className="mt-1 font-medium text-white">{formatDateTime(expense.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Notas</p>
                    <p className="mt-1 font-medium text-white">{expense.notes || 'Sin notas'}</p>
                  </div>
                </div>
                {expense.status === 'Pendiente' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleExpenseStatus(expense.id, 'Aprobado')}>Aprobar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleExpenseStatus(expense.id, 'Rechazado')}>Rechazar</Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title="Movimientos registrados" description="Filtra por empleado, tipo o rango de fechas.">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" type="date" />
          <input value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" type="date" />
          <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none" disabled={role === 'seller'}>
            <option value="all">Todos los empleados</option>
            {employeeOptions.map((employee) => (
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
