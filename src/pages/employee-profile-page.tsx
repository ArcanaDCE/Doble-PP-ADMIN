import { ArrowLeft, Boxes, Package, Wallet } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const defaultAssignmentForm = {
  productId: '',
  quantity: '1',
  notes: '',
}

export function EmployeeProfilePage() {
  const { employeeId } = useParams()
  const {
    employees,
    products,
    sales,
    payments,
    financeMovements,
    employeeStocks,
    employeeStockMovements,
    assignEmployeeStock,
    addActivity,
  } = useAppData()
  const { notifyError, notifySuccess } = useFeedback()
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignmentForm)

  const employee = employees.find((item) => item.id === employeeId) ?? {
    id: employeeId ?? 'unknown',
    name: 'Empleado sin registro',
    position: 'Sin definir',
    status: 'Inactivo' as const,
    hiredAt: 'Sin fecha',
    sales: 0,
    debt: 0,
    savings: 0,
    payments: 0,
  }

  const employeeSales = sales.filter((item) => item.employeeId === employee.id)
  const employeePayments = payments.filter((item) => item.employeeId === employee.id)
  const employeeFinance = financeMovements.filter((item) => item.employeeId === employee.id)
  const employeeAssignedStock = employeeStocks.filter((item) => item.employeeId === employee.id)
  const employeeStockHistory = employeeStockMovements.filter((item) => item.employeeId === employee.id)
  const totalAssignedUnits = employeeAssignedStock.reduce((sum, item) => sum + item.quantity, 0)
  const totalProductsAssigned = employeeAssignedStock.length

  const historyEntries = useMemo(
    () =>
      [
        ...employeeSales.map((sale) => ({
          title: 'Venta registrada',
          detail: `${sale.productName} · ${sale.quantity} unidades · ${formatCurrency(sale.total)}`,
          createdAt: sale.createdAt,
        })),
        ...employeePayments.map((payment) => ({
          title: 'Pago registrado',
          detail: `${payment.concept} · ${formatCurrency(payment.amount)}`,
          createdAt: payment.date,
        })),
        ...employeeFinance.map((movement) => ({
          title: movement.type,
          detail: `${movement.description} · ${formatCurrency(movement.amount)}`,
          createdAt: movement.createdAt,
        })),
        ...employeeStockHistory.map((movement) => ({
          title:
            movement.type === 'Asignación'
              ? 'Stock asignado'
              : movement.type === 'Retiro'
                ? 'Stock retirado'
                : 'Stock rebajado por venta',
          detail: `${movement.productName} · ${movement.quantity} unidades · ${movement.notes}`,
          createdAt: movement.createdAt,
        })),
      ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [employeeFinance, employeePayments, employeeSales, employeeStockHistory],
  )

  function handleAssignStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!assignmentForm.productId || Number(assignmentForm.quantity) <= 0) {
      notifyError('Asignación incompleta', 'Selecciona un producto y una cantidad válida.')
      return
    }

    const product = products.find((item) => item.id === assignmentForm.productId)
    if (!product) {
      notifyError('Producto no disponible', 'Selecciona nuevamente el producto antes de asignarlo.')
      return
    }

    const responseError = assignEmployeeStock({
      employeeId: employee.id,
      productId: product.id,
      quantity: Number(assignmentForm.quantity),
      notes: assignmentForm.notes.trim(),
      user: 'Administrador',
    })

    if (responseError) {
      notifyError('No se pudo asignar stock', responseError)
      return
    }

    addActivity({
      user: 'Administrador',
      action: 'Se asignó inventario a un empleado',
      module: 'Empleados',
      record: `${employee.name} · ${product.name} (${assignmentForm.quantity})`,
      createdAt: new Date().toISOString(),
    })
    setAssignmentForm(defaultAssignmentForm)
    notifySuccess('Inventario asignado', `${employee.name} recibió ${assignmentForm.quantity} unidad(es) de ${product.name}.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.name}
        description="Perfil operativo del empleado con resumen financiero, inventario asignado y ventas rebajadas automáticamente."
        actions={
          <Link to="/employees">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas" value={formatCurrency(employee.sales)} trend="Registradas" accent="emerald" />
        <StatCard label="Stock con empleado" value={String(totalAssignedUnits)} trend={`${totalProductsAssigned} productos asignados`} accent="sky" />
        <StatCard label="Deuda" value={formatCurrency(employee.debt)} trend="Pendiente" accent="amber" />
        <StatCard label="Total pagado" value={formatCurrency(employee.payments)} trend="Pago acumulado" accent="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Información" description="Datos clave del trabajador.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Nombre</p>
              <p className="mt-2 font-medium text-white">{employee.name}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Puesto</p>
              <p className="mt-2 font-medium text-white">{employee.position}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estado</p>
              <div className="mt-2">
                <StatusBadge label={employee.status} tone={employee.status === 'Activo' ? 'success' : employee.status === 'Vacaciones' ? 'warning' : 'neutral'} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fecha de ingreso</p>
              <p className="mt-2 font-medium text-white">{employee.hiredAt}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-amber-300" />
                <p className="font-medium text-white">Resumen financiero</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex justify-between gap-3"><span>Ahorro</span><span>{formatCurrency(employee.savings)}</span></div>
                <div className="flex justify-between gap-3"><span>Deuda</span><span>{formatCurrency(employee.debt)}</span></div>
                <div className="flex justify-between gap-3"><span>Pagos</span><span>{formatCurrency(employee.payments)}</span></div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-sky-300" />
                <p className="font-medium text-white">Inventario del empleado</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex justify-between gap-3"><span>Unidades disponibles</span><span>{totalAssignedUnits}</span></div>
                <div className="flex justify-between gap-3"><span>Productos distintos</span><span>{totalProductsAssigned}</span></div>
                <div className="flex justify-between gap-3"><span>Ventas registradas</span><span>{employeeSales.length}</span></div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Inventario asignado" description="Entrega stock desde bodega y controla lo que el empleado todavía tiene disponible.">
          <form onSubmit={handleAssignStock} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select
                value={assignmentForm.productId}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, productId: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · bodega {product.stock}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
              <input
                type="number"
                min="1"
                value={assignmentForm.quantity}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, quantity: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={assignmentForm.notes}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Entrega inicial, reposición, ajuste..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">
                <Boxes className="h-4 w-4" />
                Asignar inventario
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {employeeAssignedStock.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Este empleado todavía no tiene productos asignados. Entrega stock desde este mismo perfil para empezar a controlar su corte.
              </div>
            ) : (
              employeeAssignedStock.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.productName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Asignado: {item.totalAssigned} · Vendido: {item.totalSold}
                      </p>
                    </div>
                    <StatusBadge
                      label={`${item.quantity} disponible${item.quantity === 1 ? '' : 's'}`}
                      tone={item.quantity > 0 ? 'success' : 'neutral'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard id="employee-history" title="Historial cronológico" description="Incluye asignaciones de producto, ventas, pagos y movimientos financieros.">
        <div className="space-y-4">
          {historyEntries.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No hay información registrada para este empleado todavía.
            </div>
          ) : (
            historyEntries.map((entry, index) => (
              <div key={`${entry.title}-${entry.createdAt}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-3 w-3 rounded-full bg-sky-300" />
                  {index < historyEntries.length - 1 ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
                </div>
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{entry.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{entry.detail}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{formatDateTime(entry.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  )
}
