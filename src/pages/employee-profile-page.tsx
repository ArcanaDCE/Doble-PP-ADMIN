import { ArrowLeft, Package, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency } from '../lib/app-data.ts'

export function EmployeeProfilePage() {
  const { employeeId } = useParams()
  const { employees, sales, payments, financeMovements } = useAppData()

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.name}
        description="Perfil operativo del empleado con resumen financiero, ventas y movimientos del personal."
        actions={
          <>
            <Link to="/employees">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Regresar
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas" value={formatCurrency(employee.sales)} trend="Registradas" accent="emerald" />
        <StatCard label="Productos asignados" value={String(employeeSales.length)} trend="Ventas registradas" accent="sky" />
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
                <p className="font-medium text-white">Ventas</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex justify-between gap-3"><span>Total vendido</span><span>{formatCurrency(employee.sales)}</span></div>
                <div className="flex justify-between gap-3"><span>Ventas registradas</span><span>{employeeSales.length}</span></div>
                <div className="flex justify-between gap-3"><span>Pagos registrados</span><span>{employeePayments.length}</span></div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="employee-history" title="Historial cronológico" description="Todos los movimientos importantes del empleado.">
          <div className="space-y-4">
            {employeeFinance.length === 0 && employeeSales.length === 0 && employeePayments.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                No hay información registrada para este empleado todavía.
              </div>
            ) : (
              [...employeeSales.map((sale) => ({ title: 'Venta registrada', detail: `${sale.productName} · ${sale.quantity} unidades · ${formatCurrency(sale.total)}`, date: new Date(sale.createdAt).toLocaleString('es-MX') })), ...employeePayments.map((payment) => ({ title: 'Pago registrado', detail: `${payment.concept} · ${formatCurrency(payment.amount)}`, date: new Date(payment.date).toLocaleString('es-MX') })), ...employeeFinance.map((movement) => ({ title: movement.type, detail: `${movement.description} · ${formatCurrency(movement.amount)}`, date: new Date(movement.createdAt).toLocaleString('es-MX') }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, index) => (
                <div key={`${entry.title}-${index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-3 w-3 rounded-full bg-sky-300" />
                    {index < employeeFinance.length + employeeSales.length + employeePayments.length - 1 ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{entry.detail}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.date}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
