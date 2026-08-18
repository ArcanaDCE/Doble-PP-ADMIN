import { Calculator, CreditCard, Receipt } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency, formatDateTime } from '../lib/app-data.ts'

const defaultForm = {
  employeeId: '',
  productId: '',
  quantity: '1',
  paymentMethod: 'Efectivo',
}

export function SalesPage() {
  const { employees, products, sales, addSale, addInventoryMovement, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [form.productId, products],
  )

  const subtotal = Number(form.quantity || 0) * (selectedProduct?.price ?? 0)
  const profit = Number(form.quantity || 0) * ((selectedProduct?.price ?? 0) - (selectedProduct?.cost ?? 0))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.employeeId || !form.productId || Number(form.quantity) <= 0 || !selectedProduct) {
      notifyError('No se pudo registrar la venta', 'Selecciona empleado, producto y una cantidad válida.')
      return
    }

    if (selectedProduct.stock < Number(form.quantity)) {
      notifyError('Stock insuficiente', 'No hay unidades suficientes para completar la venta.')
      return
    }

    const employee = employees.find((item) => item.id === form.employeeId)
    if (!employee) {
      notifyError('Empleado no disponible', 'Selecciona nuevamente al vendedor antes de guardar.')
      return
    }

    const saleTotal = subtotal
    addSale({
      employeeId: employee.id,
      employeeName: employee.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: Number(form.quantity),
      unitPrice: selectedProduct.price,
      subtotal,
      total: saleTotal,
      profit,
      paymentMethod: form.paymentMethod as 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Crédito',
    })

    addInventoryMovement({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: 'Salida',
      quantity: Number(form.quantity),
      reason: 'Venta registrada',
      user: employee.name,
    })

    addActivity({
      user: employee.name,
      action: 'Se registró una venta',
      module: 'Ventas',
      record: `${selectedProduct.name} (${Number(form.quantity)})`,
      createdAt: new Date().toISOString(),
    })

    setForm(defaultForm)
    notifySuccess('Venta registrada', `${employee.name} vendió ${form.quantity} unidad(es) de ${selectedProduct.name}.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas"
        description="Registra ventas reales, calcula subtotal, total y ganancia, y actualiza el inventario automáticamente."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Registrar venta" description="Completa el producto, el vendedor, la cantidad y el método de pago.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
              <select value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="">Selecciona empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="">Selecciona producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
              <input type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Método de pago</label>
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Crédito</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {selectedProduct ? `Stock disponible: ${selectedProduct.stock}` : 'Selecciona un producto para conocer el stock actual.'}
              </div>
            </div>
            <div className="md:col-span-2 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-slate-300"><Calculator className="h-4 w-4 text-sky-300" /><span className="text-sm">Subtotal</span></div>
                <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(subtotal)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-slate-300"><Receipt className="h-4 w-4 text-emerald-300" /><span className="text-sm">Total</span></div>
                <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(subtotal)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-slate-300"><CreditCard className="h-4 w-4 text-amber-300" /><span className="text-sm">Ganancia</span></div>
                <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(profit)}</p>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={!selectedProduct}>Guardar venta</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Ventas recientes" description="Historial real de ventas registradas en el sistema.">
          {sales.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No hay ventas registradas todavía. Cuando registren la primera, aparecerá aquí.
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{sale.productName}</p>
                      <p className="mt-1 text-sm text-slate-400">{sale.employeeName} · {sale.paymentMethod}</p>
                    </div>
                    <StatusBadge label="Completada" tone="success" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-300">
                    <span>{sale.quantity} unidades</span>
                    <span className="font-medium text-white">{formatCurrency(sale.total)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(sale.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
