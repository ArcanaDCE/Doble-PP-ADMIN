import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatDateTime } from '../lib/app-data.ts'

const defaultForm = {
  productId: '',
  type: 'Entrada',
  quantity: '1',
  reason: '',
  user: 'Administrador',
}

export function InventoryPage() {
  const { products, inventoryMovements, addInventoryMovement, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)

  const lowStockCount = useMemo(() => products.filter((product) => product.stock <= product.minimumStock).length, [products])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.productId || Number(form.quantity) <= 0) {
      notifyError('Movimiento inválido', 'Selecciona un producto y una cantidad mayor a cero.')
      return
    }

    const product = products.find((item) => item.id === form.productId)
    if (!product) {
      notifyError('Producto no disponible', 'Selecciona nuevamente el producto para registrar el movimiento.')
      return
    }

    addInventoryMovement({
      productId: product.id,
      productName: product.name,
      type: form.type as 'Entrada' | 'Salida' | 'Ajuste' | 'Devolución',
      quantity: Number(form.quantity),
      reason: form.reason || 'Sin motivo indicado',
      user: form.user,
    })
    addActivity({
      user: form.user,
      action: `Se registró una ${form.type.toLowerCase()}`,
      module: 'Inventario',
      record: `${product.name} (${form.quantity})`,
      createdAt: new Date().toISOString(),
    })
    setForm({ ...defaultForm, productId: product.id })
    notifySuccess('Movimiento guardado', `${form.type} aplicada a ${product.name} correctamente.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Registra movimientos reales de entrada, salida, ajuste y devolución para mantener el inventario actualizado."
        actions={
          <Link to="/products" className="inline-flex">
            <Button>
              <ArrowUpCircle className="h-4 w-4" />
              Ver productos
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Productos en stock" value={String(products.length)} trend="En catálogo" accent="sky" />
        <StatCard label="Unidades disponibles" value={String(products.reduce((sum, product) => sum + product.stock, 0))} trend="Total en existencia" accent="emerald" />
        <StatCard label="Bajo stock" value={String(lowStockCount)} trend="Requieren revisión" accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Registrar movimiento" description="Cada modificación genera un movimiento con producto, motivo y responsable.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="">Selecciona un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option>Entrada</option>
                <option>Salida</option>
                <option>Ajuste</option>
                <option>Devolución</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
              <input type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Usuario</label>
              <input value={form.user} onChange={(event) => setForm((current) => ({ ...current, user: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Responsable" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Motivo</label>
              <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Compra, venta, ajuste o devolución" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Guardar movimiento</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Guía rápida" description="Operaciones frecuentes para el inventario.">
          <div className="space-y-3">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-white">
              <ArrowUpCircle className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="font-medium">Registrar entrada</p>
                <p className="text-sm text-slate-400">Recepción de mercancía o reabastecimiento.</p>
              </div>
            </div>
            <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-white">
              <ArrowDownCircle className="h-5 w-5 text-amber-300" />
              <div>
                <p className="font-medium">Registrar salida</p>
                <p className="text-sm text-slate-400">Venta o consumo del almacén.</p>
              </div>
            </div>
            <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-white">
              <SlidersHorizontal className="h-5 w-5 text-sky-300" />
              <div>
                <p className="font-medium">Aplicar ajuste</p>
                <p className="text-sm text-slate-400">Correcciones o diferencias físicas.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Historial de movimientos" description="Toda operación queda documentada con usuario y fecha.">
        {inventoryMovements.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay movimientos registrados todavía. Cuando agregues entradas, salidas o ajustes, aparecerán aquí.
          </div>
        ) : (
          <div className="space-y-3">
            {inventoryMovements.map((movement) => (
              <div key={movement.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{movement.productName}</p>
                    <p className="mt-1 text-sm text-slate-400">{movement.reason} · {movement.user}</p>
                  </div>
                  <StatusBadge label={movement.type} tone={movement.type === 'Entrada' ? 'success' : movement.type === 'Salida' ? 'warning' : movement.type === 'Ajuste' ? 'info' : 'neutral'} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Cantidad</p><p className="mt-1 font-medium text-white">{movement.quantity}</p></div>
                  <div className="rounded-2xl bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tipo</p><p className="mt-1 font-medium text-white">{movement.type}</p></div>
                  <div className="rounded-2xl bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fecha</p><p className="mt-1 font-medium text-white">{formatDateTime(movement.createdAt)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
