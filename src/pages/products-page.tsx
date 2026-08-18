import { AlertTriangle, ImagePlus, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency } from '../lib/app-data.ts'

export const PRODUCT_CATEGORIES = ['Polvo', 'Wax', 'Vapes', 'Balazos', 'Weed'] as const

const defaultForm: {
  name: string
  category: string
  description: string
  price: string
  cost: string
  stock: string
  minimumStock: string
  status: 'Activo' | 'Bajo stock' | 'Inactivo'
} = {
  name: '',
  category: PRODUCT_CATEGORIES[0],
  description: '',
  price: '0',
  cost: '0',
  stock: '0',
  minimumStock: '0',
  status: 'Activo',
}

export function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const lowStockProducts = products.filter((product) => product.stock <= product.minimumStock)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.category.trim()) {
      notifyError('Faltan datos del producto', 'Completa nombre y categoría para guardar el catálogo.')
      return
    }

    addProduct({
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      minimumStock: Number(form.minimumStock || 0),
      status: form.status,
    })
    addActivity({
      user: 'Administrador',
      action: 'Se agregó un producto',
      module: 'Productos',
      record: form.name.trim(),
      createdAt: new Date().toISOString(),
    })
    setForm(defaultForm)
    setShowForm(false)
    notifySuccess('Producto guardado', `${form.name.trim()} quedó listo en el catálogo.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Catálogo operativo con coste, precio, stock mínimo y alertas reales cuando el inventario baja."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowForm((value) => !value)}>
              <ImagePlus className="h-4 w-4" />
              {showForm ? 'Cerrar' : 'Agregar producto'}
            </Button>
            <Link to="/inventory" className="inline-flex">
              <Button>
                <Plus className="h-4 w-4" />
                Ir a inventario
              </Button>
            </Link>
          </>
        }
      />

      {lowStockProducts.length > 0 ? (
        <SectionCard className="border-amber-400/25 bg-amber-400/10" title="Alerta de inventario">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-200" />
              <p className="text-sm leading-6 text-amber-50">
                Hay {lowStockProducts.length} productos debajo o igual al stock mínimo.
              </p>
            </div>
            <Link to="/inventory" className="inline-flex">
              <Button variant="secondary">Revisar inventario</Button>
            </Link>
          </div>
        </SectionCard>
      ) : null}

      {showForm ? (
        <SectionCard title="Nuevo producto" description="Define el producto y su nivel mínimo en inventario.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Nombre del producto" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Categoría</label>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Estado</label>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as typeof form.status }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="Activo">Activo</option>
                <option value="Bajo stock">Bajo stock</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Precio</label>
              <input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Costo</label>
              <input type="number" min="0" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Stock inicial</label>
              <input type="number" min="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Stock mínimo</label>
              <input type="number" min="0" value={form.minimumStock} onChange={(event) => setForm((current) => ({ ...current, minimumStock: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div className="md:col-span-2 xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" placeholder="Descripción del producto" />
            </div>
            <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">Guardar producto</Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="Catálogo maestro" description="Catálogo real con acciones operativas sobre cada producto.">
        {products.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay productos registrados todavía. Agrega el catálogo inicial para empezar a operar.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{product.category}</p>
                  </div>
                  <StatusBadge label={product.status} tone={product.status === 'Activo' ? 'success' : product.status === 'Bajo stock' ? 'warning' : 'neutral'} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-slate-500">Precio</p><p className="mt-1 font-medium text-white">{formatCurrency(product.price)}</p></div>
                  <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-slate-500">Costo</p><p className="mt-1 font-medium text-white">{formatCurrency(product.cost)}</p></div>
                  <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-slate-500">Stock</p><p className="mt-1 font-medium text-white">{product.stock}</p></div>
                  <div className="rounded-2xl bg-slate-950/60 p-3"><p className="text-slate-500">Mínimo</p><p className="mt-1 font-medium text-white">{product.minimumStock}</p></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/inventory" className="inline-flex">
                    <Button size="sm" variant="secondary">Inventario</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => {
                    updateProduct(product.id, { status: product.stock <= product.minimumStock ? 'Activo' : 'Bajo stock' })
                    notifySuccess('Producto actualizado', `${product.name} quedó sincronizado con su stock actual.`)
                  }}>Actualizar</Button>
                  <Button size="sm" variant="danger" onClick={() => {
                    deleteProduct(product.id)
                    addActivity({ user: 'Administrador', action: 'Se eliminó un producto', module: 'Productos', record: product.name, createdAt: new Date().toISOString() })
                    notifySuccess('Producto eliminado', `${product.name} salió del catálogo.`)
                  }}>Eliminar</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
