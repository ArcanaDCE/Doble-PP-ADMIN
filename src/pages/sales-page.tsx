import { Calculator, CreditCard, Receipt } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  const { employees, products, employeeStocks, sales, addSale, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)

  const selectedEmployee = useMemo(
   () => employees.find((employee) => employee.id === form.employeeId),
   [employees, form.employeeId],
  )
  const availableEmployeeStock = useMemo(
   () => employeeStocks.filter((item) => item.employeeId === form.employeeId && item.quantity > 0),
   [employeeStocks, form.employeeId],
  )
  const selectedEmployeeStock = useMemo(
   () => employeeStocks.find((item) => item.employeeId === form.employeeId && item.productId === form.productId),
   [employeeStocks, form.employeeId, form.productId],
  )

  const selectedProduct = useMemo(
   () => products.find((product) => product.id === form.productId),
    [form.productId, products],
  )

  const subtotal = Number(form.quantity || 0) * (selectedProduct?.price ?? 0)
  const profit = Number(form.quantity || 0) * ((selectedProduct?.price ?? 0) - (selectedProduct?.cost ?? 0))
  const remainingAfterSale =
    selectedEmployeeStock && Number(form.quantity) > 0
      ? Math.max(selectedEmployeeStock.quantity - Number(form.quantity), 0)
      : selectedEmployeeStock?.quantity ?? 0

  useEffect(() => {
    if (!form.employeeId) {
      setForm((current) => (current.productId ? { ...current, productId: '' } : current))
      return
    }

    if (!form.productId) {
      return
    }

    const productStillAvailable = employeeStocks.some(
      (item) => item.employeeId === form.employeeId && item.productId === form.productId && item.quantity > 0,
    )

    if (!productStillAvailable) {
      setForm((current) => ({ ...current, productId: '' }))
    }
  }, [employeeStocks, form.employeeId, form.productId])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.employeeId || !form.productId || Number(form.quantity) <= 0 || !selectedProduct) {
      notifyError('No se pudo registrar la venta', 'Selecciona empleado, producto y una cantidad válida.')
      return
    }

    if (!selectedEmployeeStock || selectedEmployeeStock.quantity < Number(form.quantity)) {
      notifyError('Stock insuficiente', 'El empleado no tiene unidades suficientes de ese producto para registrar la venta.')
      return
    }

    const employee = employees.find((item) => item.id === form.employeeId)
    if (!employee) {
      notifyError('Empleado no disponible', 'Selecciona nuevamente al vendedor antes de guardar.')
      return
    }

    const saleTotal = subtotal
    const responseError = addSale({
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

    if (responseError) {
      notifyError('No se pudo registrar la venta', responseError)
      return
    }

    addActivity({
      user: employee.name,
      action: 'Se registró una venta',
      module: 'Ventas',
      record: `${selectedProduct.name} (${Number(form.quantity)})`,
      createdAt: new Date().toISOString(),
    })

    setForm(defaultForm)
    notifySuccess(
      'Venta registrada',
      `${employee.name} vendió ${form.quantity} unidad(es) de ${selectedProduct.name}. Quedan ${Math.max((selectedEmployeeStock?.quantity ?? 0) - Number(form.quantity), 0)} en su corte.`,
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas y cortes"
        description="Registra ventas reales y rebaja automáticamente el corte del empleado según el stock que tenga asignado."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Registrar venta" description="Completa el producto, el vendedor, la cantidad y el método de pago. Cada venta rebaja el corte del empleado automáticamente.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Empleado</label>
              <select
                value={form.employeeId}
                onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value, productId: '' }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="">{selectedEmployee ? 'Selecciona producto asignado' : 'Selecciona primero al empleado'}</option>
                {availableEmployeeStock.map((stock) => (
                  <option key={stock.id} value={stock.productId}>{stock.productName} · {stock.quantity} disponibles</option>
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
                {!selectedEmployee
                  ? 'Selecciona un empleado para ver el stock que tiene asignado.'
                  : selectedEmployeeStock
                    ? `Stock con ${selectedEmployee.name}: ${selectedEmployeeStock.quantity} unidades disponibles. Si guardas esta venta, su corte quedará en ${remainingAfterSale}.`
                    : 'Este empleado todavía no tiene stock asignado de ese producto.'}
              </div>
            </div>
            {selectedEmployee && availableEmployeeStock.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                {selectedEmployee.name} todavía no tiene inventario asignado. Entrégale producto desde su perfil antes de registrar ventas.
              </div>
            ) : null}
            {selectedEmployee && availableEmployeeStock.length > 0 ? (
              <div className="md:col-span-2 rounded-[24px] border border-sky-400/15 bg-sky-400/10 p-4">
                <p className="text-sm font-semibold text-white">Corte actual de {selectedEmployee.name}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Estos son los productos que el empleado tiene disponibles para vender. Al registrar la venta, se rebajan de aquí.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {availableEmployeeStock.map((stock) => (
                    <div key={stock.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{stock.productName}</p>
                        <StatusBadge
                          label={`${stock.quantity} disponible${stock.quantity === 1 ? '' : 's'}`}
                          tone={stock.quantity > 0 ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Asignado: {stock.totalAssigned} · Vendido: {stock.totalSold}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
              <Button type="submit" disabled={!selectedProduct || !selectedEmployeeStock}>Guardar venta y rebajar corte</Button>
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
