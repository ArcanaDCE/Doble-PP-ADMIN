import { Eye, Filter, Plus, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatCurrency } from '../lib/app-data.ts'

const defaultForm = {
  name: '',
  position: '',
  status: 'Activo' as const,
  hiredAt: new Date().toISOString().slice(0, 10),
  notes: '',
}

export function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.position.trim()) {
      notifyError('Faltan datos del empleado', 'Completa nombre y puesto para guardar el registro.')
      return
    }

    addEmployee({
      name: form.name.trim(),
      position: form.position.trim(),
      status: form.status,
      hiredAt: form.hiredAt,
      notes: form.notes.trim(),
    })
    addActivity({
      user: 'Administrador',
      action: 'Se agregó un empleado',
      module: 'Empleados',
      record: form.name.trim(),
      createdAt: new Date().toISOString(),
    })
    setForm(defaultForm)
    setShowForm(false)
    notifySuccess('Empleado guardado', `${form.name.trim()} quedó registrado correctamente.`)
  }

  const totalSales = employees.reduce((sum, employee) => sum + employee.sales, 0)
  const totalDebt = employees.reduce((sum, employee) => sum + employee.debt, 0)
  const totalSavings = employees.reduce((sum, employee) => sum + employee.savings, 0)

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
            <Button onClick={() => setShowForm((value) => !value)}>
              <Plus className="h-4 w-4" />
              {showForm ? 'Cerrar' : 'Agregar empleado'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Activos" value={String(employees.filter((item) => item.status === 'Activo').length)} trend="En operación" accent="sky" />
        <StatCard label="Ventas del equipo" value={formatCurrency(totalSales)} trend="Acumulado" accent="emerald" />
        <StatCard label="Saldo neto" value={formatCurrency(totalSavings - totalDebt)} trend="Ahorros menos deudas" accent="amber" />
      </div>

      {showForm ? (
        <SectionCard title="Nuevo empleado" description="Completa los datos básicos del trabajador.">
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
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
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
    </div>
  )
}
