import { ArrowUpRight, Bell, BriefcaseBusiness, PackagePlus, ReceiptText, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency } from '../lib/app-data.ts'
import { navigationItems } from '../lib/navigation.ts'

export function DashboardPage() {
  const { activity, totals, employees, products, settings } = useAppData()
  const { role } = useAuth()

  const summaryCards = [
    { label: 'Empleados activos', value: String(totals.activeEmployees), trend: 'Activos en operación', accent: 'sky' as const, badge: 'Activos' },
    { label: 'Vehículos activos', value: String(totals.vehiclesAvailable + totals.vehiclesAssigned), trend: `${totals.vehiclesMaintenance} en mantenimiento`, accent: 'violet' as const, badge: 'Flotilla' },
    { label: 'Ventas hoy', value: formatCurrency(totals.salesToday), trend: 'Registradas en el día', accent: 'emerald' as const, badge: 'Hoy' },
    { label: 'Sistema X', value: `X${settings.commissionRuleAmount.toLocaleString('es-MX')}`, trend: `${formatCurrency(settings.commissionRuleBonus)} por X`, accent: 'amber' as const, badge: 'Comisión' },
    { label: 'Ventas mes', value: formatCurrency(totals.salesMonth), trend: 'Mes actual', accent: 'rose' as const, badge: 'Mes' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel administrativo"
        description="Resumen operativo del negocio en tiempo real. La información se calcula desde los registros reales del sistema."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <a href="#recent-activity" className="inline-flex">
              <Button variant="secondary">
                <Bell className="h-4 w-4" />
                Ver actividad
              </Button>
            </a>
            {role === 'administrator' ? (
              <>
                <Link to="/admin" className="inline-flex">
                  <Button>
                    <UserRound className="h-4 w-4" />
                    Centro admin
                  </Button>
                </Link>
                <Link to="/employees" className="inline-flex">
                  <Button>
                    <BriefcaseBusiness className="h-4 w-4" />
                    Empleados
                  </Button>
                </Link>
                <Link to="/products" className="inline-flex">
                  <Button variant="secondary">
                    <PackagePlus className="h-4 w-4" />
                    Productos
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/my-space" className="inline-flex">
                  <Button>
                    <UserRound className="h-4 w-4" />
                    Mi espacio
                  </Button>
                </Link>
                <Link to="/sales" className="inline-flex">
                  <Button>
                    <ReceiptText className="h-4 w-4" />
                    Registrar venta
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="Mapa operativo"
          description="Acceso rápido a cada módulo del sistema administrativo."
        >
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {navigationItems
              .filter((item) => item.path !== '/dashboard' && item.path !== '/my-space')
              .filter((item) => {
                if (role === 'administrator') {
                  return true
                }

                const audience = String(item.audience)
                if (audience === 'all') {
                  return true
                }

                if (audience === 'manager') {
                  return role === 'supervisor'
                }

                if (audience === 'operator') {
                  return ['supervisor', 'seller'].includes(role)
                }

                return false
              })
              .map((item) => (
              <article key={item.path} className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:border-sky-400/30 hover:bg-sky-400/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                <Link to={item.path} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-300">
                  Abrir módulo
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="recent-activity"
          title="Actividad reciente"
          description="Registro de cambios importantes del sistema."
        >
          <div className="space-y-4">
            {activity.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-sky-400/20 bg-sky-500/5 p-6">
                <p className="text-sm leading-7 text-slate-300">
                  No hay actividad registrada todavía. Cuando agregues empleados, ventas, pagos o ajustes, aparecerán aquí.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/employees" className="inline-flex">
                    <Button size="sm" variant="secondary">
                      <BriefcaseBusiness className="h-4 w-4" />
                      Agregar empleado
                    </Button>
                  </Link>
                  <Link to="/products" className="inline-flex">
                    <Button size="sm" variant="secondary">
                      <PackagePlus className="h-4 w-4" />
                      Nuevo producto
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              activity.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{item.action}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.user} · {item.module} · {item.record}</p>
                    </div>
                    <StatusBadge label="Reciente" tone="info" className="shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Resumen operativo" description="Datos actuales del negocio.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-sm text-slate-400">Ventas del sistema</p>
              <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(totals.salesMonth)}</p>
              <p className="mt-2 text-sm text-slate-400">Ventas del mes actual</p>
              <div className="mt-6 flex h-32 items-end gap-3">
                {[35, 48, 42, 61, 72, 58, 80].map((height, index) => (
                  <div
                    key={height}
                    className={`flex-1 rounded-t-2xl ${index === 6 ? 'bg-amber-300' : 'bg-sky-400/70'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Estado general</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {employees.length} empleados registrados
                </div>
                <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {products.length} productos en catálogo
                </div>
                <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {formatCurrency(totals.savingsSum)} en ahorros
                </div>
                <div className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {formatCurrency(totals.paymentsTotal)} en pagos realizados
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Inicio limpio"
          description="La aplicación se inicia vacía y se va llenando con la operación real del negocio."
          actions={
            <Link to="/employees" className="inline-flex">
              <Button size="sm" variant="secondary">
                <BriefcaseBusiness className="h-4 w-4" />
                Comenzar
              </Button>
            </Link>
          }
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-300">
            <li>• Agrega empleados con su puesto y estado.</li>
            <li>• Registra productos y define stock mínimo.</li>
            <li>• Controla entradas, salidas y ajustes de inventario.</li>
            <li>• Registra ventas, deudas, ahorros y pagos desde el panel.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
