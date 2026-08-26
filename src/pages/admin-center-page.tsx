import { ArrowUpRight, CarFront, ClipboardList, PackagePlus, ShieldCheck, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { navigationItems } from '../lib/navigation.ts'

export function AdminCenterPage() {
  const { totals, products, employees, vehicles, assignEmployeeStock, addInventoryMovement, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [restockForm, setRestockForm] = useState({
    employeeId: '',
    productId: '',
    quantity: '1',
    notes: '',
  })
  const [inventoryForm, setInventoryForm] = useState({
    productId: '',
    quantity: '1',
    reason: '',
  })

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock <= product.minimumStock).slice(0, 6),
    [products],
  )

  function handleRestockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!restockForm.employeeId || !restockForm.productId || Number(restockForm.quantity) <= 0) {
      notifyError('Surtido incompleto', 'Selecciona empleado, producto y cantidad válida.')
      return
    }

    const employee = employees.find((item) => item.id === restockForm.employeeId)
    const product = products.find((item) => item.id === restockForm.productId)
    if (!employee || !product) {
      notifyError('Datos no disponibles', 'Selecciona nuevamente empleado o producto.')
      return
    }

    const errorMessage = assignEmployeeStock({
      employeeId: employee.id,
      productId: product.id,
      quantity: Number(restockForm.quantity),
      notes: restockForm.notes.trim() || `Surtido desde centro admin para ${employee.name}`,
      user: 'Administrador',
    })

    if (errorMessage) {
      notifyError('No se pudo surtir', errorMessage)
      return
    }

    addActivity({
      user: 'Administrador',
      action: 'Se surtió inventario desde centro admin',
      module: 'Centro admin',
      record: `${employee.name} · ${product.name} (${restockForm.quantity})`,
      createdAt: new Date().toISOString(),
    })

    setRestockForm({ employeeId: '', productId: '', quantity: '1', notes: '' })
    notifySuccess('Surtido realizado', `${employee.name} recibió ${restockForm.quantity} unidad(es) de ${product.name}.`)
  }

  function handleInventorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!inventoryForm.productId || Number(inventoryForm.quantity) <= 0) {
      notifyError('Movimiento incompleto', 'Selecciona un producto y una cantidad válida.')
      return
    }

    const product = products.find((item) => item.id === inventoryForm.productId)
    if (!product) {
      notifyError('Producto no disponible', 'Selecciona nuevamente el producto.')
      return
    }

    addInventoryMovement({
      productId: product.id,
      productName: product.name,
      type: 'Entrada',
      quantity: Number(inventoryForm.quantity),
      reason: inventoryForm.reason.trim() || 'Entrada rápida desde centro admin',
      user: 'Administrador',
    })

    addActivity({
      user: 'Administrador',
      action: 'Se re-stockeó la bodega',
      module: 'Centro admin',
      record: `${product.name} (${inventoryForm.quantity})`,
      createdAt: new Date().toISOString(),
    })

    setInventoryForm({ productId: '', quantity: '1', reason: '' })
    notifySuccess('Inventario actualizado', `${product.name} recibió entrada de ${inventoryForm.quantity} unidad(es).`)
  }

  const restockCards = [
    {
      title: 'Surtir a empleados',
      description: 'Asigna productos y cantidades al carrito de cada repartidor.',
      to: '/employees',
      icon: Users,
    },
    {
      title: 'Reponer inventario',
      description: 'Ajusta la bodega central y entradas de producto.',
      to: '/inventory',
      icon: PackagePlus,
    },
    {
      title: 'Control de flotilla',
      description: 'Administra vehículos, asignaciones y mantenimiento.',
      to: '/vehicles',
      icon: CarFront,
    },
    {
      title: 'Validar cortes',
      description: 'Revisa comisión X, neto y cierres recientes.',
      to: '/cuts',
      icon: ClipboardList,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de administrador"
        description="Área exclusiva del patron para surtir, re-stockear, modificar estructura y controlar la operación."
        actions={
          <Link to="/settings" className="inline-flex">
            <Button>
              <ShieldCheck className="h-4 w-4" />
              Configurar sistema
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Productos" value={String(products.length)} trend="Variedad disponible" accent="sky" badge="Catálogo" />
        <StatCard label="Empleados" value={String(employees.length)} trend="Con acceso operativo" accent="emerald" badge="Equipo" />
        <StatCard label="Vehículos" value={String(vehicles.length)} trend="Flotilla total" accent="violet" badge="Movilidad" />
        <StatCard label="Inventario central" value={String(totals.availableInventory)} trend="Unidades disponibles" accent="amber" badge="Bodega" />
      </div>

      <SectionCard title="Acciones principales" description="Aquí centralizas lo que solo el patron puede modificar.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {restockCards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
              <Link to={card.to} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-300">
                Abrir
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Surtido rápido a empleados" description="Entrega mercancía sin salir del centro admin.">
          <form onSubmit={handleRestockSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
              <select
                value={restockForm.employeeId}
                onChange={(event) => setRestockForm((current) => ({ ...current, employeeId: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select
                value={restockForm.productId}
                onChange={(event) => setRestockForm((current) => ({ ...current, productId: event.target.value }))}
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
                value={restockForm.quantity}
                onChange={(event) => setRestockForm((current) => ({ ...current, quantity: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={restockForm.notes}
                onChange={(event) => setRestockForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Entrega, reposición, ajuste..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Asignar stock</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Reponer bodega" description="Entrada rápida para productos de bajo stock o reposición.">
          <form onSubmit={handleInventorySubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select
                value={inventoryForm.productId}
                onChange={(event) => setInventoryForm((current) => ({ ...current, productId: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
              <input
                type="number"
                min="1"
                value={inventoryForm.quantity}
                onChange={(event) => setInventoryForm((current) => ({ ...current, quantity: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Motivo</label>
              <input
                value={inventoryForm.reason}
                onChange={(event) => setInventoryForm((current) => ({ ...current, reason: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Compra, devolución, ajuste de proveedor..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="secondary">Entrar a bodega</Button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Productos para revisar" description="Lista corta de artículos que necesitan reposición inmediata.">
        {lowStockProducts.length === 0 ? (
          <p className="text-sm leading-7 text-slate-300">No hay productos en bajo stock por ahora.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">{product.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  Stock {product.stock} / mínimo {product.minimumStock}
                </p>
                <Link to="/inventory" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-300">
                  Reponer desde inventario
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Modulos exclusivos" description="Accesos privados para administrar estructura, usuarios y reglas.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {navigationItems
            .filter((item) => item.audience === 'admin')
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:border-sky-400/30 hover:bg-sky-400/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-sky-200">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              </Link>
            ))}
        </div>
      </SectionCard>

      <SectionCard title="Nota operativa" description="La sección está pensada para que no tengas que abrir páginas sueltas para surtir o re-stockear.">
        <p className="text-sm leading-7 text-slate-300">
          Desde aquí puedes entrar a empleados, inventario, productos, vehículos, usuarios y configuración sin exponer esas herramientas al resto del personal.
        </p>
      </SectionCard>
    </div>
  )
}
