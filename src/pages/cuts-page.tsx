import { ClipboardCheck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const defaultForm = {
  employeeId: '',
  notes: '',
  closedBy: 'Administrador',
}

function getLastCutDate(cuts: Array<{ employeeId: string; createdAt: string }>, employeeId: string) {
  return [...cuts]
    .filter((cut) => cut.employeeId === employeeId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
}

export function CutsPage() {
  const { employees, employeeStocks, sales, expenses, cuts, settings, closeCut, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employeeId),
    [employees, form.employeeId],
  )

  const selectedEmployeeStocks = useMemo(
    () => employeeStocks.filter((item) => item.employeeId === form.employeeId),
    [employeeStocks, form.employeeId],
  )

  const selectedLastCut = useMemo(
    () => (form.employeeId ? getLastCutDate(cuts, form.employeeId) : undefined),
    [cuts, form.employeeId],
  )

  const selectedPeriodSales = useMemo(() => {
    if (!form.employeeId) {
      return []
    }

    const since = selectedLastCut ? new Date(selectedLastCut.createdAt).getTime() : 0
    return sales.filter((sale) => sale.employeeId === form.employeeId && new Date(sale.createdAt).getTime() > since)
  }, [form.employeeId, sales, selectedLastCut])

  const selectedPeriodExpenses = useMemo(() => {
    if (!form.employeeId) {
      return []
    }

    const since = selectedLastCut ? new Date(selectedLastCut.createdAt).getTime() : 0
    return expenses.filter(
      (expense) =>
        expense.employeeId === form.employeeId &&
        expense.status === 'Aprobado' &&
        new Date(expense.createdAt).getTime() > since,
    )
  }, [expenses, form.employeeId, selectedLastCut])

  const selectedSalesTotal = selectedPeriodSales.reduce((sum, sale) => sum + sale.total, 0)
  const selectedExpensesTotal = selectedPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const xRuleAmount = settings.commissionRuleAmount > 0 ? settings.commissionRuleAmount : 4000
  const xBonusAmount = settings.commissionRuleBonus > 0 ? settings.commissionRuleBonus : 500
  const selectedXLevel = Math.floor(selectedSalesTotal / xRuleAmount)
  const selectedCommission = selectedXLevel * xBonusAmount
  const selectedAssignedUnits = selectedEmployeeStocks.reduce((sum, item) => sum + item.totalAssigned, 0)
  const selectedSoldUnits = selectedEmployeeStocks.reduce((sum, item) => sum + item.totalSold, 0)
  const selectedRemainingUnits = selectedEmployeeStocks.reduce((sum, item) => sum + item.quantity, 0)
  const selectedDebt = selectedEmployee?.debt ?? 0
  const selectedSavings = selectedEmployee?.savings ?? 0
  const selectedPayments = selectedEmployee?.payments ?? 0
  const selectedNet = selectedCommission - selectedDebt - selectedExpensesTotal

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.employeeId) {
      notifyError('Falta empleado', 'Selecciona al repartidor antes de cerrar el corte.')
      return
    }

    if (!selectedEmployee) {
      notifyError('Empleado no disponible', 'Selecciona nuevamente al repartidor.')
      return
    }

    const errorMessage = closeCut({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      closedBy: form.closedBy.trim() || 'Administrador',
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
      salesTotal: selectedSalesTotal,
      xLevel: selectedXLevel,
      commission: selectedCommission,
      assignedUnits: selectedAssignedUnits,
      soldUnits: selectedSoldUnits,
      remainingUnits: selectedRemainingUnits,
      debt: selectedDebt,
      savings: selectedSavings,
      payments: selectedPayments,
      expenses: selectedExpensesTotal,
      net: selectedNet,
    })

    if (errorMessage) {
      notifyError('No se pudo cerrar el corte', errorMessage)
      return
    }

    addActivity({
      user: form.closedBy.trim() || 'Administrador',
      action: 'Se cerró un corte',
      module: 'Cortes',
      record: selectedEmployee.name,
      createdAt: new Date().toISOString(),
    })

    setForm(defaultForm)
    notifySuccess('Corte cerrado', `${selectedEmployee.name} quedó cerrado con ${formatCurrency(selectedCommission)} de comisión.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cortes"
        description="Cierra el periodo del repartidor con ventas, comisión X y stock restante."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cortes cerrados" value={String(cuts.length)} trend="Historial acumulado" accent="sky" />
        <StatCard label="Comisión X" value={`${settings.commissionRuleAmount.toLocaleString('es-MX')}`} trend={`+${formatCurrency(settings.commissionRuleBonus)} por X`} accent="violet" />
        <StatCard label="Ventas abiertas" value={String(sales.length)} trend="Ventas registradas" accent="emerald" />
        <StatCard label="Repartidores activos" value={String(employees.length)} trend="Con corte disponible" accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Cerrar corte" description="Selecciona al repartidor y confirma su cierre del periodo actual.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Repartidor</label>
              <select
                value={form.employeeId}
                onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona repartidor</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cerrado por</label>
              <input
                value={form.closedBy}
                onChange={(event) => setForm((current) => ({ ...current, closedBy: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Observaciones del cierre"
              />
            </div>

            <div className="md:col-span-2 rounded-[24px] border border-sky-400/15 bg-sky-400/10 p-4">
              {!selectedEmployee ? (
                <p className="text-sm text-slate-300">Selecciona un repartidor para ver el resumen de su corte.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ventas del periodo</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedSalesTotal)}</p>
                    <p className="mt-2 text-sm text-slate-400">{selectedPeriodSales.length} venta(s)</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sistema X</p>
                    <p className="mt-2 text-2xl font-semibold text-white">X{selectedXLevel}</p>
                    <p className="mt-2 text-sm text-slate-400">{formatCurrency(selectedCommission)} de comisión</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stock restante</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{selectedRemainingUnits}</p>
                    <p className="mt-2 text-sm text-slate-400">{selectedSoldUnits} vendidos de {selectedAssignedUnits}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neto estimado</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedNet)}</p>
                    <p className="mt-2 text-sm text-slate-400">Comisión menos deuda y gastos</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gastos aprobados</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedExpensesTotal)}</p>
                    <p className="mt-2 text-sm text-slate-400">{selectedPeriodExpenses.length} gasto(s)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">
                <ClipboardCheck className="h-4 w-4" />
                Cerrar corte
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Cortes recientes" description="Historial de cierres ya confirmados.">
          {cuts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              Todavía no hay cortes cerrados.
            </div>
          ) : (
            <div className="space-y-3">
              {cuts.map((cut) => (
                <div key={cut.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{cut.employeeName}</p>
                      <p className="mt-1 text-sm text-slate-400">Cerrado por {cut.closedBy}</p>
                    </div>
                    <StatusBadge label="Cerrado" tone="success" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ventas</p>
                      <p className="mt-1 font-medium text-white">{formatCurrency(cut.salesTotal)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">X</p>
                      <p className="mt-1 font-medium text-white">X{cut.xLevel}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Comisión</p>
                      <p className="mt-1 font-medium text-white">{formatCurrency(cut.commission)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stock</p>
                      <p className="mt-1 font-medium text-white">{cut.remainingUnits} restantes</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deuda</p>
                      <p className="mt-1 font-medium text-white">{formatCurrency(cut.debt ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gastos</p>
                      <p className="mt-1 font-medium text-white">{formatCurrency(cut.expenses ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neto</p>
                      <p className="mt-1 font-medium text-white">
                        {formatCurrency(cut.net ?? ((cut.commission ?? 0) - (cut.debt ?? 0) - (cut.expenses ?? 0)))}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fecha</p>
                      <p className="mt-1 font-medium text-white">{formatDateTime(cut.createdAt)}</p>
                    </div>
                  </div>
                  {cut.notes ? <p className="mt-3 text-xs text-slate-500">{cut.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
