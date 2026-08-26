import { Download, FileText } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { formatCurrency, formatDate } from '../lib/app-data.ts'

function getDateKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function getRecentDates(days: number) {
  return Array.from({ length: days }, (_value, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (days - index - 1))
    return date
  })
}

function toCsvValue(value: string | number) {
  const normalized = String(value).replace(/"/g, '""')
  return `"${normalized}"`
}

export function ReportsPage() {
  const { employees, sales, payments, financeMovements, cuts, vehicles, vehicleMovements, settings, totals } = useAppData()
  const { notifyInfo, notifySuccess } = useFeedback()

  const weeklySales = useMemo(() => {
    return getRecentDates(7).map((date) => {
      const dayKey = getDateKey(date)
      const total = sales
        .filter((sale) => getDateKey(sale.createdAt) === dayKey)
        .reduce((sum, sale) => sum + sale.total, 0)

      return {
        key: dayKey,
        label: new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date).slice(0, 3),
        total,
      }
    })
  }, [sales])

  const maxWeeklySale = useMemo(
    () => Math.max(...weeklySales.map((item) => item.total), 1),
    [weeklySales],
  )

  const employeePerformance = useMemo(() => {
    return employees
      .map((employee) => {
        const employeeSales = sales.filter((sale) => sale.employeeId === employee.id)
        const employeePayments = payments.filter((payment) => payment.employeeId === employee.id)

        return {
          id: employee.id,
          name: employee.name,
          totalSales: employeeSales.reduce((sum, sale) => sum + sale.total, 0),
          totalProfit: employeeSales.reduce((sum, sale) => sum + sale.profit, 0),
          salesCount: employeeSales.length,
          paymentsCount: employeePayments.length,
        }
      })
      .filter((employee) => employee.salesCount > 0 || employee.paymentsCount > 0)
      .sort((left, right) => right.totalSales - left.totalSales || right.salesCount - left.salesCount)
      .slice(0, 5)
  }, [employees, payments, sales])

  const totalCommission = cuts.reduce((sum, cut) => sum + cut.commission, 0)
  const totalX = cuts.reduce((sum, cut) => sum + cut.xLevel, 0)
  const averageSalesPerCut = cuts.length > 0 ? cuts.reduce((sum, cut) => sum + cut.salesTotal, 0) / cuts.length : 0
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'Disponible' || vehicle.status === 'Asignado').length
  const vehiclesInMaintenance = vehicles.filter((vehicle) => vehicle.status === 'Mantenimiento').length
  const recentVehicleMovements = vehicleMovements.length

  const reportCards = [
    {
      label: 'Ventas de hoy',
      value: formatCurrency(totals.salesToday),
      trend: sales.length > 0 ? `${sales.length} operaciones registradas` : 'Sin ventas registradas',
      accent: 'emerald' as const,
      badge: 'Ingresos',
    },
    {
      label: 'Ganancias',
      value: formatCurrency(sales.reduce((sum, sale) => sum + sale.profit, 0)),
      trend: 'Margen calculado desde ventas reales',
      accent: 'sky' as const,
      badge: 'Margen',
    },
    {
      label: 'Pagos',
      value: formatCurrency(totals.paymentsTotal),
      trend: payments.length > 0 ? `${payments.length} pagos registrados` : 'Sin pagos registrados',
      accent: 'amber' as const,
      badge: 'Nomina',
    },
    {
      label: 'Deudas / ahorros',
      value: formatCurrency(totals.savingsSum - totals.debtSum),
      trend: financeMovements.length > 0 ? `${financeMovements.length} movimientos financieros` : 'Sin movimientos financieros',
      accent: 'violet' as const,
      badge: 'Balance',
    },
    {
      label: 'Sistema X',
      value: `X${totalX}`,
      trend: `${formatCurrency(totalCommission)} en comisión · venta por X: ${formatCurrency(settings.commissionRuleAmount)}`,
      accent: 'rose' as const,
      badge: 'Cortes',
    },
  ]

  const handleExportCsv = () => {
    if (sales.length === 0 && payments.length === 0 && financeMovements.length === 0) {
      notifyInfo('No hay datos para exportar', 'Registra ventas, pagos o movimientos antes de generar el CSV.')
      return
    }

    const csvRows = [
      ['Tipo', 'Fecha', 'Empleado', 'Detalle', 'Monto'],
      ...sales.map((sale) => [
        'Venta',
        formatDate(sale.createdAt),
        sale.employeeName,
        `${sale.productName} x${sale.quantity}`,
        sale.total,
      ]),
      ...payments.map((payment) => [
        'Pago',
        formatDate(payment.date),
        payment.employeeName,
        payment.concept,
        payment.amount,
      ]),
      ...financeMovements.map((movement) => [
        movement.type,
        formatDate(movement.createdAt),
        movement.employeeName,
        movement.description,
        movement.amount,
      ]),
    ]

    const csvContent = `\uFEFF${csvRows.map((row) => row.map(toCsvValue).join(',')).join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doble-pp-reportes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    notifySuccess('Reporte exportado', 'El archivo CSV se descargó correctamente.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Métricas ejecutivas y exportación operativa con base en los movimientos reales del sistema."
        actions={
          <>
            <a href="#weekly-report" className="inline-flex">
              <Button variant="secondary">
                <FileText className="h-4 w-4" />
                Ver resumen
              </Button>
            </a>
            <Button onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {reportCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Cortes cerrados" value={String(cuts.length)} trend={`Promedio ${formatCurrency(averageSalesPerCut)}`} accent="sky" />
        <StatCard label="Vehículos activos" value={String(activeVehicles)} trend={`${vehiclesInMaintenance} en mantenimiento`} accent="emerald" />
        <StatCard label="Movimientos de flotilla" value={String(recentVehicleMovements)} trend="Historial de unidades" accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          id="weekly-report"
          title="Comportamiento semanal"
          description="Tendencia de ventas de los últimos siete dias."
        >
          {sales.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-sky-400/20 bg-sky-500/5 p-6">
              <p className="text-sm leading-7 text-slate-300">
                Todavia no hay ventas registradas para construir la tendencia semanal.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/sales" className="inline-flex">
                  <Button size="sm">Registrar primera venta</Button>
                </Link>
                <Link to="/products" className="inline-flex">
                  <Button size="sm" variant="secondary">Revisar catalogo</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-72 items-end gap-3 rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
              {weeklySales.map((point, index) => (
                <div key={point.key} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full text-center text-xs font-medium text-slate-400">
                    {formatCurrency(point.total)}
                  </div>
                  <div
                    className={`w-full rounded-t-3xl ${index === weeklySales.length - 1 ? 'bg-amber-300' : 'bg-sky-400/75'}`}
                    style={{ height: `${Math.max((point.total / maxWeeklySale) * 100, 8)}%` }}
                  />
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="employee-performance"
          title="Indicadores por empleado"
          description="Ranking rapido de rendimiento individual con ventas y pagos asociados."
        >
          {employeePerformance.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6">
              <p className="text-sm leading-7 text-slate-300">
                Aun no hay suficiente actividad para mostrar un ranking de empleados.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/employees" className="inline-flex">
                  <Button size="sm" variant="secondary">Ir a empleados</Button>
                </Link>
                <Link to="/sales" className="inline-flex">
                  <Button size="sm">Cargar ventas</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {employeePerformance.map((employee, index) => (
                <div key={employee.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{employee.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {employee.salesCount} ventas · {employee.paymentsCount} pagos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-sky-200">
                        {formatCurrency(employee.totalSales)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        #{index + 1}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                      Ventas: {formatCurrency(employee.totalSales)}
                    </div>
                    <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                      Ganancia: {formatCurrency(employee.totalProfit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Sistema X y flotilla"
          description="Resumen de cortes, comisión y estado general de vehículos."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              Venta por X: {formatCurrency(settings.commissionRuleAmount)}
            </div>
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              Comisión por X: {formatCurrency(settings.commissionRuleBonus)}
            </div>
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              Comisión acumulada: {formatCurrency(totalCommission)}
            </div>
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              Cortes cerrados: {cuts.length}
            </div>
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              Vehículos activos: {activeVehicles}
            </div>
            <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              En mantenimiento: {vehiclesInMaintenance}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
