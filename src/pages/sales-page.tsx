import { Calculator, CreditCard, Plus, Receipt, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useAuth } from '../app/providers/auth-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { createId, formatCurrency, formatDateTime, resolveProductPricing, type Product, type Sale } from '../lib/app-data.ts'

type SaleLineForm = {
  id: string
  productId: string
  variantId: string
  quantity: string
  unitPrice: string
}

type SaleLineDraft = Omit<SaleLineForm, 'unitPrice'> & {
  product: Product | undefined
  unitPrice: number
  unitCost: number
  variantName: string | null
  total: number
  profit: number
}

function createSaleLine(): SaleLineForm {
  return { id: createId('sale_line'), productId: '', variantId: '', quantity: '1', unitPrice: '' }
}

const defaultForm = {
  employeeId: '',
  lines: [createSaleLine()],
}

export function SalesPage() {
  const { employees, products, employeeStocks, sales, addSales, addActivity } = useAppData()
  const { role, user } = useAuth()
  const { notifySuccess, notifyError } = useFeedback()
  const [form, setForm] = useState(defaultForm)
  const [isSaving, setIsSaving] = useState(false)

  const sellerEmployeeId = role === 'seller' ? user?.employeeId : undefined
  const employeeOptions = useMemo(
    () => (sellerEmployeeId ? employees.filter((employee) => employee.id === sellerEmployeeId) : employees),
    [employees, sellerEmployeeId],
  )
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employeeId),
    [employees, form.employeeId],
  )
  const availableEmployeeStock = useMemo(
    () => employeeStocks.filter((item) => item.employeeId === form.employeeId && item.quantity > 0),
    [employeeStocks, form.employeeId],
  )

  useEffect(() => {
    if (sellerEmployeeId) {
      setForm({ employeeId: sellerEmployeeId, lines: [createSaleLine()] })
    }
  }, [sellerEmployeeId])

  const lineDrafts = useMemo<SaleLineDraft[]>(
    () =>
      form.lines.map((line) => {
        const product = products.find((item) => item.id === line.productId)
        const pricing = product
          ? resolveProductPricing(product, line.variantId || undefined)
          : { price: 0, cost: 0, variantName: null }
        const quantity = Number(line.quantity)
        const unitPrice = Number(line.unitPrice)

        return {
          ...line,
          product,
          unitPrice,
          unitCost: pricing.cost,
          variantName: pricing.variantName,
          total: Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitPrice)
            ? Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100
            : 0,
          profit: Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitPrice)
            ? Math.round((quantity * (unitPrice - pricing.cost) + Number.EPSILON) * 100) / 100
            : 0,
        }
      }),
    [form.lines, products],
  )

  const quantitiesByProduct = useMemo(() => {
    const quantities = new Map<string, number>()
    for (const line of lineDrafts) {
      if (line.productId && Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0) {
        quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + Number(line.quantity))
      }
    }
    return quantities
  }, [lineDrafts])

  const totalUnits = lineDrafts.reduce((sum, line) => {
    const quantity = Number(line.quantity)
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0)
  }, 0)
  const saleTotal = lineDrafts.reduce((sum, line) => sum + line.total, 0)
  const totalProfit = lineDrafts.reduce((sum, line) => sum + line.profit, 0)
  const stockError = [...quantitiesByProduct.entries()].find(([productId, quantity]) => {
    const stock = employeeStocks.find((item) => item.employeeId === form.employeeId && item.productId === productId)
    return !stock || quantity > stock.quantity
  })
  const hasBlankPrice = form.lines.some((line) => line.productId && line.unitPrice.trim() === '')
  const hasInvalidLine = lineDrafts.length === 0 || lineDrafts.some((line) => {
    const quantity = Number(line.quantity)
    const unitPrice = Number(line.unitPrice)
    const hasRequiredVariant = !line.product?.variants?.length || line.product.variants.some((variant) => variant.id === line.variantId)
    return !line.product || !Number.isInteger(quantity) || quantity < 1 ||
      !Number.isFinite(unitPrice) || unitPrice < 0 || !hasRequiredVariant
  }) || hasBlankPrice

  const saleGroups = useMemo(() => {
    const groups = new Map<string, Sale[]>()
    for (const sale of sales) {
      const groupKey = sale.saleGroupId ?? sale.id
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), sale])
    }
    return [...groups.values()]
  }, [sales])

  function updateLine(lineId: string, updates: Partial<SaleLineForm>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, ...updates } : line)),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.employeeId || !selectedEmployee || hasInvalidLine) {
      notifyError('Venta incompleta', 'Selecciona un vendedor, producto, variedad y cantidad válida en cada renglón.')
      return
    }
    if (stockError) {
      const product = products.find((item) => item.id === stockError[0])
      notifyError('Stock insuficiente', `Solo hay ${employeeStocks.find((item) => item.employeeId === form.employeeId && item.productId === stockError[0])?.quantity ?? 0} unidades de ${product?.name ?? 'este producto'} en el stock del vendedor.`)
      return
    }

    const saleLines = lineDrafts.flatMap((line) => {
      if (!line.product) return []
      return [{
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        productId: line.product.id,
        productName: line.product.name,
        variantId: line.variantId || undefined,
        variantName: line.variantName ?? undefined,
        quantity: Number(line.quantity),
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        subtotal: line.total,
        total: line.total,
        profit: line.profit,
        paymentMethod: 'Efectivo' as const,
      }]
    })

    setIsSaving(true)
    try {
      const responseError = await addSales(saleLines)
      if (responseError) {
        notifyError('No se pudo registrar la venta', responseError)
        return
      }
    } catch (error) {
      console.error(error)
      notifyError('No se pudo registrar la venta', 'No se confirmó la operación. Actualiza la página y revisa el historial antes de reintentar.')
      return
    } finally {
      setIsSaving(false)
    }

    const lineSummary = lineDrafts
      .map((line) => `${line.quantity} × ${line.product?.name ?? 'Producto'}${line.variantName ? ` (${line.variantName})` : ''}`)
      .join(', ')
    addActivity({
      user: selectedEmployee.name,
      action: 'Se registró una venta',
      module: 'Ventas',
      record: `${lineSummary} · ${formatCurrency(saleTotal)}`,
      createdAt: new Date().toISOString(),
    })

    setForm({ employeeId: form.employeeId, lines: [createSaleLine()] })
    notifySuccess(
      'Venta registrada',
      `${selectedEmployee.name}: ${totalUnits} unidad(es) por ${formatCurrency(saleTotal)} en efectivo. El stock se rebajó correctamente.`,
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas y cortes"
        description="Agrega varios renglones, incluso el mismo producto con precios distintos. El total y el stock se calculan juntos."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Registrar venta" description="Puedes repetir un producto con otra variedad/precio. La venta se guarda como un solo grupo y el corte suma sus importes reales.">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Vendedor</label>
              <select
                value={form.employeeId}
                onChange={(event) => setForm({ employeeId: event.target.value, lines: [createSaleLine()] })}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
                disabled={role === 'seller'}
              >
                <option value="">Selecciona vendedor</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>

            {form.lines.map((line, index) => {
              const draft = lineDrafts[index]
              const variants = draft.product?.variants ?? []
              return (
                <div key={line.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Renglón {index + 1}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Quitar renglón ${index + 1}`}
                      onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">Producto</label>
                      <select
                        value={line.productId}
                        onChange={(event) => {
                          const product = products.find((item) => item.id === event.target.value)
                          updateLine(line.id, { productId: event.target.value, variantId: '', unitPrice: product ? String(product.price) : '' })
                        }}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 outline-none"
                        disabled={!form.employeeId}
                      >
                        <option value="">Selecciona producto asignado</option>
                        {availableEmployeeStock.map((stock) => (
                          <option key={stock.id} value={stock.productId}>{stock.productName} · {stock.quantity} disponibles</option>
                        ))}
                      </select>
                    </div>
                    {variants.length > 0 ? (
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">Variedad / precio</label>
                        <select
                          value={line.variantId}
                          onChange={(event) => {
                            const selectedVariant = variants.find((variant) => variant.id === event.target.value)
                            updateLine(line.id, {
                              variantId: event.target.value,
                              unitPrice: String(selectedVariant?.price ?? draft.product?.price ?? ''),
                            })
                          }}
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 outline-none"
                        >
                          <option value="">Selecciona precio</option>
                          {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>{variant.name} · {formatCurrency(variant.price)}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">Precio unitario cobrado</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                        className="h-11 w-full rounded-xl border border-sky-400/30 bg-sky-400/5 px-3 text-sm font-semibold text-white outline-none focus:border-sky-300"
                        aria-label={`Precio unitario cobrado, renglón ${index + 1}`}
                      />
                      {draft.product ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Precio de lista: {formatCurrency(draft.product.price)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-end justify-between rounded-xl bg-slate-950/50 px-3 py-2">
                      <div>
                        <p className="text-xs text-slate-400">Precio unitario</p>
                        <p className="mt-1 font-medium text-white">{formatCurrency(draft.unitPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Importe del renglón</p>
                        <p className="mt-1 font-semibold text-emerald-200">{formatCurrency(draft.total)}</p>
                      </div>
                    </div>
                  </div>
                  {draft.product?.variants?.length && !line.variantId ? (
                    <p className="mt-3 text-xs text-amber-200">Elige el precio que realmente se cobró en este renglón.</p>
                  ) : null}
                </div>
              )
            })}

            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, createSaleLine()] }))}
              disabled={!form.employeeId || availableEmployeeStock.length === 0}
            >
              <Plus className="h-4 w-4" />
              Agregar producto / otro precio
            </Button>

            {selectedEmployee && availableEmployeeStock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                {selectedEmployee.name} todavía no tiene inventario asignado. El administrador debe asignarlo antes de registrar ventas.
              </div>
            ) : null}
            {stockError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                Cantidad mayor que el stock disponible para uno de los productos. Revisa los renglones repetidos.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-slate-300"><Calculator className="h-4 w-4 text-sky-300" /><span className="text-sm">Unidades</span></div>
                <p className="mt-3 text-2xl font-semibold text-white">{totalUnits}</p>
              </div>
              <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-400/10 p-4">
                <div className="flex items-center gap-2 text-emerald-100"><Receipt className="h-4 w-4 text-emerald-300" /><span className="text-sm font-semibold">Total en efectivo</span></div>
                <p className="mt-3 text-3xl font-bold text-white">{formatCurrency(saleTotal)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-slate-300"><CreditCard className="h-4 w-4 text-amber-300" /><span className="text-sm">Ganancia</span></div>
                <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(totalProfit)}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || !selectedEmployee || hasInvalidLine || Boolean(stockError)}>
                {isSaving ? 'Registrando venta...' : 'Guardar venta y rebajar stock'}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Ventas recientes" description="Cada venta con varios precios aparece agrupada y suma sus importes para los cortes.">
          {saleGroups.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No hay ventas registradas todavía. Cuando registren la primera, aparecerá aquí.
            </div>
          ) : (
            <div className="space-y-3">
              {saleGroups.map((group) => {
                const firstSale = group[0]
                const groupTotal = group.reduce((sum, sale) => sum + sale.total, 0)
                const groupQuantity = group.reduce((sum, sale) => sum + sale.quantity, 0)
                return (
                  <div key={firstSale.saleGroupId ?? firstSale.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{firstSale.employeeName} · Venta en efectivo</p>
                        <p className="mt-1 text-sm text-slate-400">{groupQuantity} unidades · {group.length} renglón(es)</p>
                      </div>
                      <StatusBadge label="Completada" tone="success" />
                    </div>
                    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                      {group.map((sale) => (
                        <div key={sale.id} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-slate-300">
                            {sale.quantity} × {sale.productName}{sale.variantName ? ` · ${sale.variantName}` : ''}
                            <span className="block text-xs text-slate-500">{formatCurrency(sale.unitPrice)} c/u · cobrado</span>
                          </span>
                          <span className="font-medium text-white">{formatCurrency(sale.total)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
                      <span className="text-slate-400">Total</span>
                      <span className="text-lg font-semibold text-emerald-200">{formatCurrency(groupTotal)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(firstSale.createdAt)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
