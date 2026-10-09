import { BadgeDollarSign } from 'lucide-react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { countSaleTransactions, formatCurrency, formatDateTime } from '../lib/app-data.ts'

export function MyEarningsPage() {
  const { user } = useAuth()
  const { cuts, employees, sales, settings } = useAppData()
  const linkedEmployee = employees.find((employee) => employee.id === user?.employeeId)
  const lastCut = linkedEmployee
    ? cuts
      .filter((cut) => cut.employeeId === linkedEmployee.id)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
    : undefined
  const lastCutTime = lastCut ? new Date(lastCut.createdAt).getTime() : 0
  const periodSales = linkedEmployee
    ? sales.filter(
      (sale) => sale.employeeId === linkedEmployee.id && new Date(sale.createdAt).getTime() > lastCutTime,
    )
    : []
  const salesTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0)
  const ruleAmount = settings.commissionRuleAmount > 0 ? settings.commissionRuleAmount : 4000
  const bonusAmount = settings.commissionRuleBonus > 0 ? settings.commissionRuleBonus : 500
  const xLevel = Math.floor(salesTotal / ruleAmount)
  const commission = xLevel * bonusAmount
  const salesTowardNextX = salesTotal % ruleAmount
  const remainingForNextX = ruleAmount - salesTowardNextX
  const progressToNextX = (salesTowardNextX / ruleAmount) * 100
  const unitsSold = periodSales.reduce((sum, sale) => sum + sale.quantity, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis ganancias"
        description="Consulta la comisión generada por tus X y cuánto te falta para alcanzar la siguiente."
      />

      {!linkedEmployee ? (
        <SectionCard title="Sin perfil vinculado" description="Tu usuario todavía no está vinculado a un empleado.">
          <p className="text-sm leading-7 text-slate-300">
            Pide al administrador que vincule tu cuenta con tu perfil de empleado para consultar tus ventas y comisión.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Comisión generada"
              value={formatCurrency(commission)}
              trend={`${xLevel} X completas × ${formatCurrency(bonusAmount)}`}
              accent="emerald"
              badge="Por X"
            />
            <StatCard
              label="X acumuladas"
              value={`X${xLevel}`}
              trend={`${formatCurrency(salesTotal)} vendidos en este periodo`}
              accent="violet"
              badge="Periodo actual"
            />
            <StatCard
              label="Falta para la siguiente X"
              value={formatCurrency(remainingForNextX)}
              trend={`Meta por X: ${formatCurrency(ruleAmount)}`}
              accent="sky"
              badge="Progreso"
            />
            <StatCard
              label="Unidades vendidas"
              value={String(unitsSold)}
              trend={`${countSaleTransactions(periodSales)} operaciones de venta`}
              accent="amber"
              badge="Actividad"
            />
          </div>

          <SectionCard title="Progreso de la siguiente X" description="El avance se calcula desde tu último corte.">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-6 w-6 shrink-0 text-sky-200" />
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300 transition-all"
                  style={{ width: `${progressToNextX}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-medium text-white">{Math.floor(progressToNextX)}%</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>Vendido: {formatCurrency(salesTowardNextX)} de {formatCurrency(ruleAmount)} para la siguiente X.</p>
              <p>{lastCut ? `Último corte: ${formatDateTime(lastCut.createdAt)}` : 'Aún no tienes cortes registrados.'}</p>
            </div>
            <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50/90">
              Esta es una estimación de comisión acumulada; el monto definitivo se confirma al registrar tu corte.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  )
}
