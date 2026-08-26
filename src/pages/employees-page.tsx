import { Boxes, Eye, Filter, Plus, Search, Shield, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { createId, formatCurrency } from '../lib/app-data.ts'

function createDefaultForm() {
  return {
    name: '',
    position: '',
    status: 'Activo' as const,
    hiredAt: new Date().toISOString().slice(0, 10),
    notes: '',
    accessRole: 'seller' as 'administrator' | 'supervisor' | 'seller' | 'employee' | 'none',
    accessEmail: '',
    accessPassword: '',
  }
}

const defaultStockForm = {
  productId: '',
  quantity: '1',
  direction: 'add' as 'add' | 'remove',
  notes: '',
}

function createInitialStockRow() {
  return {
    id: createId('employee_stock_row'),
    productId: '',
    quantity: '',
    notes: '',
  }
}

export function EmployeesPage() {
  const { employees, products, employeeStocks, data, addEmployee, updateEmployee, deleteEmployee, adjustEmployeeStock, addUser, updateUser, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(createDefaultForm)
  const [initialStockRows, setInitialStockRows] = useState<Array<ReturnType<typeof createInitialStockRow>>>([])
  const [stockManagerEmployeeId, setStockManagerEmployeeId] = useState('')
  const [stockForm, setStockForm] = useState(defaultStockForm)
  const [accessManageId, setAccessManageId] = useState('')
  const [accessForm, setAccessForm] = useState({ role: 'seller' as 'administrator' | 'supervisor' | 'seller' | 'employee', email: '', password: '' })
  const [showAccessPassword, setShowAccessPassword] = useState(false)

  function openEmployeeForm() {
    setForm(createDefaultForm())
    setInitialStockRows(products.length > 0 ? [createInitialStockRow()] : [])
    setShowForm(true)
  }

  function resetEmployeeForm() {
    setForm(createDefaultForm())
    setInitialStockRows([])
    setShowForm(false)
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(search.toLowerCase()) ||
        employee.position.toLowerCase().includes(search.toLowerCase()) ||
        employee.status.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [employees, search, statusFilter])

  const initialStockPreview = useMemo(() => {
    return initialStockRows
      .filter((row) => row.productId && Number(row.quantity) > 0)
      .map((row) => {
        const product = products.find((item) => item.id === row.productId)
        return {
          id: row.id,
          productName: product?.name ?? 'Producto no disponible',
          quantity: Number(row.quantity),
          notes: row.notes.trim(),
        }
      })
  }, [initialStockRows, products])

  const initialStockTotalUnits = initialStockPreview.reduce((sum, item) => sum + item.quantity, 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.position.trim()) {
      notifyError('Faltan datos del empleado', 'Completa nombre y puesto para guardar el registro.')
      return
    }

    const requestedAssignments = initialStockRows.filter((row) => row.productId || row.quantity.trim() || row.notes.trim())
    const selectedProducts = new Set<string>()

    for (const row of requestedAssignments) {
      if (!row.productId) {
        notifyError('Producto pendiente', 'Selecciona el producto en cada línea de inventario inicial.')
        return
      }

      if (!row.quantity.trim() || Number(row.quantity) <= 0) {
        notifyError('Cantidad inválida', 'Indica una cantidad válida en cada producto asignado al empleado.')
        return
      }

      if (selectedProducts.has(row.productId)) {
        notifyError('Producto repetido', 'No repitas el mismo producto. Usa una sola línea por producto.')
        return
      }

      selectedProducts.add(row.productId)
    }

    const { employee, error } = addEmployee({
      name: form.name.trim(),
      position: form.position.trim(),
      status: form.status,
      hiredAt: form.hiredAt,
      notes: form.notes.trim(),
      initialStock: requestedAssignments.map((row) => ({
        productId: row.productId,
        quantity: Number(row.quantity),
        notes: row.notes.trim(),
      })),
    })

    if (error || !employee) {
      notifyError('No se pudo guardar el empleado', error ?? 'Intenta nuevamente.')
      return
    }

    // Si se configuró acceso, crear usuario vinculado automáticamente
    if (form.accessRole !== 'none' && form.accessEmail.trim() && form.accessPassword.trim()) {
      const emailNormalized = form.accessEmail.trim().toLowerCase()
      const alreadyExists = data.users.some((user) => user.email.toLowerCase() === emailNormalized)

      if (alreadyExists) {
        notifyError('Correo duplicado', `El correo ${emailNormalized} ya tiene acceso. Usa uno diferente.`)
      } else {
        addUser({
          name: employee.name,
          email: emailNormalized,
          role: form.accessRole,
          status: 'Activo',
          password: form.accessPassword.trim(),
          employeeId: employee.id,
          lastLogin: undefined,
        })
      }
    }

    addActivity({
      user: 'Administrador',
      action: 'Se agregó un empleado',
      module: 'Empleados',
      record: employee.name,
      createdAt: new Date().toISOString(),
    })

    if (requestedAssignments.length > 0) {
      addActivity({
        user: 'Administrador',
        action: 'Se asignó stock inicial a un empleado',
        module: 'Empleados',
        record: `${employee.name} · ${requestedAssignments.length} producto(s)`,
        createdAt: new Date().toISOString(),
      })
    }

    resetEmployeeForm()
    notifySuccess(
      'Empleado guardado',
      requestedAssignments.length > 0
        ? `${employee.name} quedó registrado con ${requestedAssignments.length} producto(s) asignado(s).`
        : `${employee.name} quedó registrado correctamente.`,
    )
  }

  function handleEmployeeStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!stockManagerEmployeeId || !stockForm.productId || Number(stockForm.quantity) <= 0) {
      notifyError('Ajuste incompleto', 'Selecciona empleado, producto y cantidad válida.')
      return
    }

    const product = products.find((item) => item.id === stockForm.productId)
    if (!product || !selectedStockEmployee) {
      notifyError('Datos no disponibles', 'Recarga el apartado e intenta nuevamente.')
      return
    }

    const responseError = adjustEmployeeStock({
      employeeId: stockManagerEmployeeId,
      productId: stockForm.productId,
      quantity: Number(stockForm.quantity),
      direction: stockForm.direction,
      notes: stockForm.notes.trim(),
      user: 'Administrador',
    })

    if (responseError) {
      notifyError('No se pudo modificar el stock', responseError)
      return
    }

    addActivity({
      user: 'Administrador',
      action: stockForm.direction === 'add' ? 'Se agregó stock a un empleado' : 'Se retiró stock de un empleado',
      module: 'Empleados',
      record: `${selectedStockEmployee.name} · ${product.name} (${stockForm.quantity})`,
      createdAt: new Date().toISOString(),
    })
    setStockForm(defaultStockForm)
    notifySuccess(
      stockForm.direction === 'add' ? 'Stock agregado' : 'Stock retirado',
      `${selectedStockEmployee.name} ${stockForm.direction === 'add' ? 'recibió' : 'devolvió'} ${stockForm.quantity} unidad(es) de ${product.name}.`,
    )
  }

  const totalSales = employees.reduce((sum, employee) => sum + employee.sales, 0)
  const totalDebt = employees.reduce((sum, employee) => sum + employee.debt, 0)
  const totalSavings = employees.reduce((sum, employee) => sum + employee.savings, 0)
  const totalAssignedStock = employeeStocks.reduce((sum, item) => sum + item.quantity, 0)
  const selectedStockEmployee = employees.find((employee) => employee.id === stockManagerEmployeeId) ?? null
  const selectedEmployeeStocks = employeeStocks.filter((item) => item.employeeId === stockManagerEmployeeId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de empleados"
        description="Administra el personal, revisa su información y controla el estado operativo del equipo."
        actions={
          <>
            <Link to="/dashboard" className="inline-flex">
              <Button variant="secondary">
                <Filter className="h-4 w-4" />
                Volver al panel
              </Button>
            </Link>
            <Button onClick={() => {
              if (showForm) {
                resetEmployeeForm()
                return
              }

              openEmployeeForm()
            }}>
              <Plus className="h-4 w-4" />
              {showForm ? 'Cerrar' : 'Agregar empleado'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Activos" value={String(employees.filter((item) => item.status === 'Activo').length)} trend="En operación" accent="sky" />
        <StatCard label="Ventas del equipo" value={formatCurrency(totalSales)} trend="Acumulado" accent="emerald" />
        <StatCard label="Saldo neto" value={formatCurrency(totalSavings - totalDebt)} trend="Ahorros menos deudas" accent="amber" />
        <StatCard label="Stock en empleados" value={String(totalAssignedStock)} trend="Unidades por cortar" accent="violet" />
      </div>

      {showForm ? (
        <SectionCard title="Nuevo empleado" description="Completa los datos del trabajador y, si corresponde, asígnale su inventario inicial desde este mismo formulario.">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Puesto</label>
              <input value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Supervisor, vendedor..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Estado</label>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as typeof form.status }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="Activo">Activo</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Fecha de ingreso</label>
              <input type="date" value={form.hiredAt} onChange={(event) => setForm((current) => ({ ...current, hiredAt: event.target.value }))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" placeholder="Notas del empleado" />
            </div>

            {/* Acceso de inicio de sesión */}
            <div className="md:col-span-2 rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Acceso al sistema</p>
                  <p className="text-xs text-slate-400">Define si este empleado podrá iniciar sesión en la app y con qué rol.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Rol de acceso</label>
                  <select
                    value={form.accessRole}
                    onChange={(event) => setForm((current) => ({ ...current, accessRole: event.target.value as typeof form.accessRole }))}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
                  >
                    <option value="none">Sin acceso</option>
                    <option value="seller">Vendedor</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="employee">Empleado</option>
                    <option value="administrator">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Correo de acceso</label>
                  <input
                    type="email"
                    value={form.accessEmail}
                    onChange={(event) => setForm((current) => ({ ...current, accessEmail: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                    placeholder="correo@empresa.com"
                    disabled={form.accessRole === 'none'}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Contraseña</label>
                  <input
                    type="password"
                    value={form.accessPassword}
                    onChange={(event) => setForm((current) => ({ ...current, accessPassword: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                    placeholder="Contraseña temporal"
                    disabled={form.accessRole === 'none'}
                  />
                </div>
              </div>
              {form.accessRole !== 'none' && (
                <p className="mt-3 text-xs text-amber-200/80">
                  Al guardar, se creará automáticamente un acceso con ese correo y contraseña vinculado a este empleado.
                </p>
              )}
            </div>

            <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/5 p-4 sm:p-5">              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white">Inventario inicial del empleado</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    Aquí puedes entregarle varios productos desde el primer momento. La primera línea aparece automáticamente para que el inventario inicial sea más fácil de configurar.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setInitialStockRows((current) => [...current, createInitialStockRow()])}
                  disabled={products.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Agregar producto
                </Button>
              </div>

              {products.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                  Primero registra productos en el módulo de productos para poder asignar inventario inicial al empleado.
                </div>
              ) : initialStockRows.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                  Sin productos asignados por ahora. Usa “Agregar producto” para añadir otra línea de inventario.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {initialStockRows.map((row) => {
                    const selectedProduct = products.find((product) => product.id === row.productId)

                    return (
                      <div key={row.id} className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
                        <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr_1.2fr_auto]">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
                            <select
                              value={row.productId}
                              onChange={(event) => {
                                const nextProductId = event.target.value
                                setInitialStockRows((current) => current.map((item) => (
                                  item.id === row.id ? { ...item, productId: nextProductId } : item
                                )))
                              }}
                              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
                            >
                              <option value="">Selecciona producto</option>
                              {products.map((product) => {
                                const usedByAnotherRow = initialStockRows.some((item) => item.id !== row.id && item.productId === product.id)

                                return (
                                  <option key={product.id} value={product.id} disabled={usedByAnotherRow}>
                                    {product.name} · bodega {product.stock}
                                  </option>
                                )
                              })}
                            </select>
                            {selectedProduct ? (
                              <p className="mt-2 text-xs text-slate-400">
                                Disponible en bodega: {selectedProduct.stock} unidad{selectedProduct.stock === 1 ? '' : 'es'}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(event) => {
                                const nextQuantity = event.target.value
                                setInitialStockRows((current) => current.map((item) => (
                                  item.id === row.id ? { ...item, quantity: nextQuantity } : item
                                )))
                              }}
                              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
                            <input
                              value={row.notes}
                              onChange={(event) => {
                                const nextNotes = event.target.value
                                setInitialStockRows((current) => current.map((item) => (
                                  item.id === row.id ? { ...item, notes: nextNotes } : item
                                )))
                              }}
                              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                              placeholder="Entrega inicial, consignación..."
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full xl:w-auto"
                              onClick={() => setInitialStockRows((current) => current.filter((item) => item.id !== row.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {initialStockPreview.length > 0 ? (
                <div className="mt-4 rounded-[24px] border border-sky-400/15 bg-sky-400/10 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Resumen del stock inicial</p>
                      <p className="text-sm text-slate-300">
                        Este empleado se guardará con {initialStockPreview.length} producto(s) y {initialStockTotalUnits} unidad(es) asignadas.
                      </p>
                    </div>
                    <StatusBadge
                      label={`${initialStockTotalUnits} unidad${initialStockTotalUnits === 1 ? '' : 'es'}`}
                      tone="success"
                    />
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {initialStockPreview.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-white">{item.productName}</p>
                          <p className="text-sm text-sky-200">{item.quantity} unidad{item.quantity === 1 ? '' : 'es'}</p>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{item.notes || 'Sin nota para esta asignación inicial.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetEmployeeForm}>Cancelar</Button>
              <Button type="submit">Guardar empleado</Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="Directorio" description="Búsqueda rápida y acciones reales sobre el personal.">
        <div className="mb-5 grid gap-3 md:grid-cols-[1.5fr_1fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Buscar por nombre, puesto o estado"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Vacaciones">Vacaciones</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay empleados registrados todavía. Usa el botón “Agregar empleado” para comenzar.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    {['Nombre', 'Puesto', 'Estado', 'Ingreso', 'Ventas', 'Deuda', 'Ahorro', 'Pagos', 'Acciones'].map((header) => (
                      <th key={header} className="px-4 py-4 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-white/5">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">{employee.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {employeeStocks.filter((item) => item.employeeId === employee.id).length} productos · {employeeStocks.filter((item) => item.employeeId === employee.id).reduce((sum, item) => sum + item.quantity, 0)} unidades
                        </p>
                        {(() => {
                          const linkedUser = data.users.find((user) => user.employeeId === employee.id)
                          if (!linkedUser) return null
                          return (
                            <p className="mt-1 text-xs text-sky-300">
                              {linkedUser.email} · {linkedUser.role === 'seller' ? 'Vendedor' : linkedUser.role === 'supervisor' ? 'Supervisor' : linkedUser.role === 'administrator' ? 'Admin' : 'Empleado'}
                            </p>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">{employee.position}</td>
                      <td className="px-4 py-4">
                        <StatusBadge label={employee.status} tone={employee.status === 'Activo' ? 'success' : employee.status === 'Vacaciones' ? 'warning' : 'neutral'} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">{employee.hiredAt}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatCurrency(employee.sales)}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatCurrency(employee.debt)}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatCurrency(employee.savings)}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">{formatCurrency(employee.payments)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/employees/${employee.id}`} className="inline-flex">
                            <Button size="sm" variant="secondary">
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setStockManagerEmployeeId((current) => (current === employee.id ? '' : employee.id))
                              setStockForm(defaultStockForm)
                              setAccessManageId('')
                            }}
                          >
                            <Boxes className="h-4 w-4" />
                            Stock
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const linkedUser = data.users.find((user) => user.employeeId === employee.id)
                              setAccessManageId((current) => (current === employee.id ? '' : employee.id))
                              setAccessForm({
                                role: (linkedUser?.role as 'administrator' | 'supervisor' | 'seller' | 'employee') ?? 'seller',
                                email: linkedUser?.email ?? '',
                                password: '',
                              })
                              setShowAccessPassword(false)
                              setStockManagerEmployeeId('')
                            }}
                          >
                            <Shield className="h-4 w-4" />
                            Acceso
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const nextStatus = employee.status === 'Activo' ? 'Inactivo' : 'Activo'
                            updateEmployee(employee.id, { status: nextStatus })
                            addActivity({
                              user: 'Administrador',
                              action: employee.status === 'Activo' ? 'Se desactivó un empleado' : 'Se reactivó un empleado',
                              module: 'Empleados',
                              record: employee.name,
                              createdAt: new Date().toISOString(),
                            })
                            notifySuccess(
                              nextStatus === 'Activo' ? 'Empleado reactivado' : 'Empleado desactivado',
                              `${employee.name} ahora está en estado ${nextStatus.toLowerCase()}.`,
                            )
                          }}>
                            {employee.status === 'Activo' ? 'Desactivar' : 'Reactivar'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => {
                            deleteEmployee(employee.id)
                            addActivity({
                              user: 'Administrador',
                              action: 'Se eliminó un empleado',
                              module: 'Empleados',
                              record: employee.name,
                              createdAt: new Date().toISOString(),
                            })
                            notifySuccess('Empleado eliminado', `${employee.name} fue retirado del directorio.`)
                          }}>
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {accessManageId ? (() => {
        const managedEmployee = employees.find((employee) => employee.id === accessManageId)
        const linkedUser = data.users.find((user) => user.employeeId === accessManageId)
        if (!managedEmployee) return null

        return (
          <SectionCard
            title={`Acceso de ${managedEmployee.name}`}
            description="Configura o actualiza las credenciales de inicio de sesión vinculadas a este empleado."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Rol</label>
                <select
                  value={accessForm.role}
                  onChange={(event) => setAccessForm((current) => ({ ...current, role: event.target.value as typeof accessForm.role }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
                >
                  <option value="seller">Vendedor</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="employee">Empleado</option>
                  <option value="administrator">Administrador</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Correo de acceso</label>
                <input
                  type="email"
                  value={accessForm.email}
                  onChange={(event) => setAccessForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                  placeholder="correo@empresa.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Contraseña</label>
                <div className="relative">
                  <input
                    type={showAccessPassword ? 'text' : 'password'}
                    value={accessForm.password}
                    onChange={(event) => setAccessForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-12 text-sm text-white outline-none"
                    placeholder={linkedUser ? 'Nueva contraseña (opcional)' : 'Contraseña de acceso'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    onClick={() => setShowAccessPassword((v) => !v)}
                  >
                    {showAccessPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            </div>

            {linkedUser ? (
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
                Acceso actual: <strong>{linkedUser.email}</strong> · rol: <strong>{linkedUser.role === 'seller' ? 'Vendedor' : linkedUser.role === 'supervisor' ? 'Supervisor' : linkedUser.role === 'administrator' ? 'Administrador' : 'Empleado'}</strong>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                Este empleado aún no tiene acceso al sistema. Completa los campos para crearlo.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAccessManageId('')}>Cerrar</Button>
              <Button onClick={() => {
                if (!accessForm.email.trim()) {
                  notifyError('Correo requerido', 'Escribe el correo de acceso del empleado.')
                  return
                }

                if (!linkedUser && !accessForm.password.trim()) {
                  notifyError('Contraseña requerida', 'Escribe la contraseña para crear el acceso.')
                  return
                }

                const emailNormalized = accessForm.email.trim().toLowerCase()

                if (linkedUser) {
                  // Actualizar usuario existente
                  updateUser(linkedUser.id, {
                    email: emailNormalized,
                    role: accessForm.role,
                    ...(accessForm.password.trim() ? { password: accessForm.password.trim() } : {}),
                  })
                  notifySuccess('Acceso actualizado', `Las credenciales de ${managedEmployee.name} fueron actualizadas.`)
                } else {
                  // Verificar que no exista otro usuario con ese correo
                  const alreadyExists = data.users.some((user) => user.email.toLowerCase() === emailNormalized)
                  if (alreadyExists) {
                    notifyError('Correo duplicado', `El correo ${emailNormalized} ya está siendo usado por otro usuario.`)
                    return
                  }

                  addUser({
                    name: managedEmployee.name,
                    email: emailNormalized,
                    role: accessForm.role,
                    status: 'Activo',
                    password: accessForm.password.trim(),
                    employeeId: managedEmployee.id,
                  })
                  notifySuccess('Acceso creado', `${managedEmployee.name} ya puede iniciar sesión con ${emailNormalized}.`)
                }

                setAccessManageId('')
              }}>
                {linkedUser ? 'Actualizar acceso' : 'Crear acceso'}
              </Button>
            </div>
          </SectionCard>
        )
      })() : null}

      {selectedStockEmployee ? (
        <SectionCard
          title={`Stock de ${selectedStockEmployee.name}`}
          description="Asigna o retira varios tipos de producto directamente desde el módulo de empleados."
        >
          <form onSubmit={handleEmployeeStockSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Producto</label>
              <select
                value={stockForm.productId}
                onChange={(event) => setStockForm((current) => ({ ...current, productId: event.target.value }))}
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
              <label className="mb-2 block text-sm font-medium text-slate-300">Movimiento</label>
              <select
                value={stockForm.direction}
                onChange={(event) => setStockForm((current) => ({ ...current, direction: event.target.value as 'add' | 'remove' }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="add">Agregar al empleado</option>
                <option value="remove">Retirar del empleado</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Cantidad</label>
              <input
                type="number"
                min="1"
                value={stockForm.quantity}
                onChange={(event) => setStockForm((current) => ({ ...current, quantity: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={stockForm.notes}
                onChange={(event) => setStockForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Entrega, reposición o retiro"
              />
            </div>
            <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setStockManagerEmployeeId('')}>
                Cerrar
              </Button>
              <Button type="submit">Guardar ajuste</Button>
            </div>
          </form>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {selectedEmployeeStocks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300 lg:col-span-2">
                Este empleado todavía no tiene productos asignados. Desde aquí puedes agregarle varios tipos de producto y también retirarlos cuando haga su corte.
              </div>
            ) : (
              selectedEmployeeStocks.map((stock) => (
                <div key={stock.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{stock.productName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Asignado: {stock.totalAssigned} · Vendido: {stock.totalSold}
                      </p>
                    </div>
                    <StatusBadge
                      label={`${stock.quantity} disponible${stock.quantity === 1 ? '' : 's'}`}
                      tone={stock.quantity > 0 ? 'success' : 'neutral'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}
