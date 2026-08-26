import { Clock3, Coins, ShoppingBag, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

export function MySpacePage() {
  const { user } = useAuth()
  const { employees, employeeStocks, employeeStockMovements, sales, cuts, financeMovements } = useAppData()

  const linkedEmployee = employees.find((employee) => employee.id === user?.employeeId)
  const assignedStock = linkedEmployee
    ? employeeStocks.filter((item) => item.employeeId === linkedEmployee.id)
    : []
  const recentSales = linkedEmployee ? sales.filter((sale) => sale.employeeId === linkedEmployee.id).slice(0, 5) : []
  const recentCuts = linkedEmployee ? cuts.filter((cut) => cut.employeeId === linkedEmployee.id).slice(0, 5) : []
  const recentMovements = linkedEmployee
    ? employeeStockMovements.filter((movement) => movement.employeeId === linkedEmployee.id).slice(0, 5)
    : []
  const financeHistory = linkedEmployee
    ? financeMovements.filter((movement) => movement.employeeId === linkedEmployee.id).slice(0, 5)
    : []

  const totalAssignedUnits = assignedStock.reduce((sum, item) => sum + item.quantity, 0)
  const totalSoldUnits = assignedStock.reduce((sum, item) => sum + item.totalSold, 0)
  const totalSales = recentSales.reduce((sum, sale) => sum + sale.total, 0)
  const totalDebt = linkedEmployee?.debt ?? 0
  const totalSavings = linkedEmployee?.savings ?? 0
  const totalPayments = linkedEmployee?.payments ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi espacio"
        description="Vista personal del empleado con su stock, cortes, ahorro y actividad reciente."
        actions={
          <Link to="/sales" className="inline-flex">
            <Button>
              <ShoppingBag className="h-4 w-4" />
              Registrar venta
            </Button>
          </Link>
        }
      />

      {!linkedEmployee ? (
        <SectionCard title="Sin perfil vinculado" description="Tu usuario no tiene un empleado asignado todavía.">
          <p className="text-sm leading-7 text-slate-300">
            Pide al administrador que vincule tu cuenta con tu registro de empleado para ver tu stock, cortes y movimientos.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Ventas" value={formatCurrency(totalSales)} trend="Acumulado reciente" accent="emerald" badge="Personal" />
            <StatCard label="Stock asignado" value={String(totalAssignedUnits)} trend={`${assignedStock.length} productos`} accent="sky" badge="Carrito" />
            <StatCard label="Vendidas" value={String(totalSoldUnits)} trend="Unidades rebajadas" accent="violet" badge="Cortes" />
            <StatCard label="Pagos" value={formatCurrency(totalPayments)} trend="Abonos acumulados" accent="amber" badge="Cobros" />
            <StatCard label="Ahorro" value={formatCurrency(totalSavings)} trend="Saldo personal" accent="violet" badge="Ahorro" />
            <StatCard label="Deuda" value={formatCurrency(totalDebt)} trend="Saldo pendiente" accent="amber" badge="Deuda" />
          </div>

          <SectionCard title="Tu perfil" description="Resumen directo de tu información laboral.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Nombre</p>
                <p className="mt-2 font-medium text-white">{linkedEmployee.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Puesto</p>
                <p className="mt-2 font-medium text-white">{linkedEmployee.position}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estado</p>
                <div className="mt-2">
                  <StatusBadge label={linkedEmployee.status} tone={linkedEmployee.status === 'Activo' ? 'success' : 'neutral'} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fecha de ingreso</p>
                <p className="mt-2 font-medium text-white">{linkedEmployee.hiredAt}</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <SectionCard title="Stock y cortes" description="Lo que tienes asignado y lo que se ha rebajado en cortes.">
              <div className="space-y-3">
                {assignedStock.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    Aún no tienes productos asignados.
                  </p>
                ) : (
                  assignedStock.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.productName}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Asignado: {item.totalAssigned} · Vendido: {item.totalSold}
                          </p>
                        </div>
                        <StatusBadge label={`${item.quantity} disponibles`} tone="success" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard title="Movimientos recientes" description="Ventas, cortes, ahorros y ajustes personales.">
              <div className="space-y-3">
                {[...recentSales.map((sale) => ({
                  title: 'Venta',
                  detail: `${sale.productName} · ${formatCurrency(sale.total)}`,
                  createdAt: sale.createdAt,
                })), ...recentCuts.map((cut) => ({
                  title: 'Corte',
                  detail: `${cut.employeeName} · ${formatCurrency(cut.net)}`,
                  createdAt: cut.createdAt,
                })), ...recentMovements.map((movement) => ({
                  title: movement.type,
                  detail: `${movement.productName} · ${movement.notes}`,
                  createdAt: movement.createdAt,
                })), ...financeHistory.map((movement) => ({
                  title: movement.type,
                  detail: `${movement.description} · ${formatCurrency(movement.amount)}`,
                  createdAt: movement.createdAt,
                }))].slice(0, 8).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 className="h-4 w-4" />
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      <SectionCard title="Acciones rápidas" description="Accesos a tus módulos operativos.">
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/cuts" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <UserRound className="h-6 w-6 text-sky-200" />
            <p className="mt-3 font-medium text-white">Mis cortes</p>
            <p className="mt-1 text-sm text-slate-400">Revisar cierres y comisión.</p>
          </Link>
          <Link to="/finance" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Coins className="h-6 w-6 text-sky-200" />
            <p className="mt-3 font-medium text-white">Ahorros y deuda</p>
            <p className="mt-1 text-sm text-slate-400">Ver saldos personales.</p>
          </Link>
          <Link to="/sales" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <ShoppingBag className="h-6 w-6 text-sky-200" />
            <p className="mt-3 font-medium text-white">Ventas</p>
            <p className="mt-1 text-sm text-slate-400">Registrar ventas desde tu stock.</p>
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
