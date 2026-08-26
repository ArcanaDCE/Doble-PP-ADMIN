import { CirclePlus, Fuel, PencilLine, Trash2, Wrench } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatCard } from '../components/ui/stat-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'
import { formatDateTime } from '../lib/app-data.ts'

type VehicleFormState = {
  name: string
  plate: string
  model: string
  type: string
  year: string
  mileage: string
  fuelLevel: string
  status: 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Fuera de servicio'
  assignedEmployeeId: string
  notes: string
}

type MovementFormState = {
  vehicleId: string
  type: 'Asignación' | 'Liberación' | 'Uso' | 'Combustible' | 'Mantenimiento' | 'Ajuste'
  notes: string
}

function createDefaultVehicleForm(): VehicleFormState {
  return {
    name: '',
    plate: '',
    model: '',
    type: '',
    year: String(new Date().getFullYear()),
    mileage: '0',
    fuelLevel: '100',
    status: 'Disponible',
    assignedEmployeeId: '',
    notes: '',
  }
}

function createDefaultMovementForm(): MovementFormState {
  return {
    vehicleId: '',
    type: 'Uso',
    notes: '',
  }
}

const statusToneMap: Record<VehicleFormState['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  Disponible: 'success',
  Asignado: 'neutral',
  Mantenimiento: 'warning',
  'Fuera de servicio': 'danger',
}

export function VehiclesPage() {
  const {
    employees,
    vehicles,
    vehicleMovements,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addVehicleMovement,
    addActivity,
  } = useAppData()
  const { notifyError, notifySuccess } = useFeedback()
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(createDefaultVehicleForm)
  const [movementForm, setMovementForm] = useState<MovementFormState>(createDefaultMovementForm)
  const [editingVehicleId, setEditingVehicleId] = useState('')

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'Disponible' || vehicle.status === 'Asignado').length,
    [vehicles],
  )
  const assignedVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'Asignado').length,
    [vehicles],
  )
  const maintenanceVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === 'Mantenimiento').length,
    [vehicles],
  )
  const totalMileage = useMemo(
    () => vehicles.reduce((sum, vehicle) => sum + vehicle.mileage, 0),
    [vehicles],
  )

  const selectedVehicleForMovement = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === movementForm.vehicleId),
    [movementForm.vehicleId, vehicles],
  )

  function resetVehicleForm() {
    setVehicleForm(createDefaultVehicleForm())
    setEditingVehicleId('')
  }

  function handleEditVehicle(vehicleId: string) {
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) {
      notifyError('Vehículo no disponible', 'El vehículo seleccionado ya no existe.')
      return
    }

    setEditingVehicleId(vehicleId)
    setVehicleForm({
      name: vehicle.name,
      plate: vehicle.plate,
      model: vehicle.model,
      type: vehicle.type,
      year: String(vehicle.year),
      mileage: String(vehicle.mileage),
      fuelLevel: String(vehicle.fuelLevel),
      status: vehicle.status,
      assignedEmployeeId: vehicle.assignedEmployeeId ?? '',
      notes: vehicle.notes ?? '',
    })
  }

  function handleVehicleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!vehicleForm.name.trim() || !vehicleForm.plate.trim() || !vehicleForm.model.trim()) {
      notifyError('Faltan datos', 'Completa nombre, placa y modelo del vehículo.')
      return
    }

    const assignedEmployee = vehicleForm.assignedEmployeeId
      ? employees.find((employee) => employee.id === vehicleForm.assignedEmployeeId)
      : null

    const shouldAssign = Boolean(assignedEmployee)
    const resolvedStatus = shouldAssign ? 'Asignado' : vehicleForm.status

    if (vehicleForm.status === 'Asignado' && !shouldAssign) {
      notifyError('Falta asignación', 'Selecciona un empleado para vehículos asignados.')
      return
    }

    const payload = {
      name: vehicleForm.name.trim(),
      plate: vehicleForm.plate.trim().toUpperCase(),
      model: vehicleForm.model.trim(),
      type: vehicleForm.type.trim() || 'Operativo',
      year: Number(vehicleForm.year),
      mileage: Number(vehicleForm.mileage),
      fuelLevel: Math.min(Math.max(Number(vehicleForm.fuelLevel), 0), 100),
      status: resolvedStatus,
      assignedEmployeeId: shouldAssign ? assignedEmployee?.id : undefined,
      assignedEmployeeName: shouldAssign ? assignedEmployee?.name : undefined,
      notes: vehicleForm.notes.trim(),
    }

    if (editingVehicleId) {
      updateVehicle(editingVehicleId, payload)
      addActivity({
        user: 'Administrador',
        action: 'Se actualizó un vehículo',
        module: 'Vehículos',
        record: `${payload.name} · ${payload.plate}`,
        createdAt: new Date().toISOString(),
      })
      notifySuccess('Vehículo actualizado', `${payload.name} quedó actualizado correctamente.`)
    } else {
      addVehicle(payload)
      addActivity({
        user: 'Administrador',
        action: 'Se registró un vehículo',
        module: 'Vehículos',
        record: `${payload.name} · ${payload.plate}`,
        createdAt: new Date().toISOString(),
      })
      notifySuccess('Vehículo agregado', `${payload.name} quedó registrado en la flotilla.`)
    }

    resetVehicleForm()
  }

  function handleDeleteVehicle(vehicleId: string) {
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) {
      notifyError('Vehículo no disponible', 'El vehículo ya no existe.')
      return
    }

    deleteVehicle(vehicleId)
    addActivity({
      user: 'Administrador',
      action: 'Se eliminó un vehículo',
      module: 'Vehículos',
      record: `${vehicle.name} · ${vehicle.plate}`,
      createdAt: new Date().toISOString(),
    })
    notifySuccess('Vehículo eliminado', `${vehicle.name} fue retirado del registro.`)
  }

  function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!movementForm.vehicleId) {
      notifyError('Falta vehículo', 'Selecciona un vehículo para registrar el movimiento.')
      return
    }

    const vehicle = vehicles.find((item) => item.id === movementForm.vehicleId)
    if (!vehicle) {
      notifyError('Vehículo no disponible', 'Selecciona nuevamente el vehículo.')
      return
    }

    const nextUpdates: Partial<typeof vehicle> = {}

    if (movementForm.type === 'Asignación') {
      nextUpdates.status = 'Asignado'
    }

    if (movementForm.type === 'Liberación') {
      nextUpdates.status = 'Disponible'
      nextUpdates.assignedEmployeeId = undefined
      nextUpdates.assignedEmployeeName = undefined
    }

    if (movementForm.type === 'Mantenimiento') {
      nextUpdates.status = 'Mantenimiento'
    }

    if (Object.keys(nextUpdates).length > 0) {
      updateVehicle(vehicle.id, nextUpdates)
    }

    addVehicleMovement({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      type: movementForm.type,
      user: 'Administrador',
      notes: movementForm.notes.trim() || 'Movimiento registrado manualmente',
    })

    addActivity({
      user: 'Administrador',
      action: 'Se registró un movimiento de vehículo',
      module: 'Vehículos',
      record: `${vehicle.name} · ${movementForm.type}`,
      createdAt: new Date().toISOString(),
    })

    setMovementForm(createDefaultMovementForm())
    notifySuccess('Movimiento guardado', `El movimiento de ${vehicle.name} quedó registrado.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehículos"
        description="Gestiona la flotilla, asigna unidades a empleados y deja trazabilidad de uso, mantenimiento y estado."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <a href="#vehicle-form" className="inline-flex">
              <Button variant="secondary">
                <CirclePlus className="h-4 w-4" />
                Nuevo vehículo
              </Button>
            </a>
            <a href="#vehicle-movements" className="inline-flex">
              <Button>
                <Wrench className="h-4 w-4" />
                Registrar movimiento
              </Button>
            </a>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flotilla total" value={String(vehicles.length)} trend="Vehículos registrados" accent="sky" />
        <StatCard label="Disponibles / asignados" value={`${activeVehicles}`} trend={`${assignedVehicles} asignados`} accent="emerald" />
        <StatCard label="Mantenimiento" value={String(maintenanceVehicles)} trend="En revisión" accent="amber" />
        <StatCard label="Kilometraje total" value={String(totalMileage)} trend="Acumulado" accent="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          id="vehicle-form"
          title={editingVehicleId ? 'Editar vehículo' : 'Registrar vehículo'}
          description="Agrega unidades, placa, modelo y asignación operativa."
        >
          <form onSubmit={handleVehicleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
              <input
                value={vehicleForm.name}
                onChange={(event) => setVehicleForm((current) => ({ ...current, name: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Nissan NP300"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Placa</label>
              <input
                value={vehicleForm.plate}
                onChange={(event) => setVehicleForm((current) => ({ ...current, plate: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="ABC-123"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Modelo</label>
              <input
                value={vehicleForm.model}
                onChange={(event) => setVehicleForm((current) => ({ ...current, model: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Frontier / T60 / etc."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
              <input
                value={vehicleForm.type}
                onChange={(event) => setVehicleForm((current) => ({ ...current, type: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Camioneta, moto, sedán"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Año</label>
              <input
                type="number"
                min="1900"
                value={vehicleForm.year}
                onChange={(event) => setVehicleForm((current) => ({ ...current, year: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Kilometraje</label>
              <input
                type="number"
                min="0"
                value={vehicleForm.mileage}
                onChange={(event) => setVehicleForm((current) => ({ ...current, mileage: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Combustible %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={vehicleForm.fuelLevel}
                onChange={(event) => setVehicleForm((current) => ({ ...current, fuelLevel: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Estado</label>
              <select
                value={vehicleForm.status}
                onChange={(event) =>
                  setVehicleForm((current) => ({
                    ...current,
                    status: event.target.value as VehicleFormState['status'],
                  }))
                }
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="Disponible">Disponible</option>
                <option value="Asignado">Asignado</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Fuera de servicio">Fuera de servicio</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Empleado asignado</label>
              <select
                value={vehicleForm.assignedEmployeeId}
                onChange={(event) =>
                  setVehicleForm((current) => ({
                    ...current,
                    assignedEmployeeId: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Sin asignar</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={vehicleForm.notes}
                onChange={(event) => setVehicleForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Detalles del vehículo"
              />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" className="flex-1">
                {editingVehicleId ? 'Actualizar vehículo' : 'Guardar vehículo'}
              </Button>
              {editingVehicleId ? (
                <Button type="button" variant="secondary" onClick={resetVehicleForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Registro de movimiento" description="Controla asignaciones, mantenimiento y cambios de estado.">
          <form onSubmit={handleMovementSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Vehículo</label>
              <select
                value={movementForm.vehicleId}
                onChange={(event) => setMovementForm((current) => ({ ...current, vehicleId: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="">Selecciona vehículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} · {vehicle.plate}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
              <select
                value={movementForm.type}
                onChange={(event) =>
                  setMovementForm((current) => ({
                    ...current,
                    type: event.target.value as MovementFormState['type'],
                  }))
                }
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none"
              >
                <option value="Uso">Uso</option>
                <option value="Asignación">Asignación</option>
                <option value="Liberación">Liberación</option>
                <option value="Combustible">Combustible</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Ajuste">Ajuste</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Notas</label>
              <input
                value={movementForm.notes}
                onChange={(event) => setMovementForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                placeholder="Ruta, servicio, reparación, etc."
              />
            </div>
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {selectedVehicleForMovement
                  ? `${selectedVehicleForMovement.name} · ${selectedVehicleForMovement.plate} · Estado actual: ${selectedVehicleForMovement.status}.`
                  : 'Selecciona un vehículo para revisar su estado antes de registrar el movimiento.'}
              </div>
            </div>
            <Button type="submit" className="md:col-span-2">
              Registrar movimiento
            </Button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Flotilla registrada" description="Listado de vehículos con su estado operativo y asignación actual.">
        {vehicles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay vehículos registrados todavía.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {vehicles.map((vehicle) => (
              <article key={vehicle.id} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{vehicle.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {vehicle.plate} · {vehicle.model} · {vehicle.year}
                    </p>
                  </div>
                  <StatusBadge label={vehicle.status} tone={statusToneMap[vehicle.status]} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Asignado a</p>
                    <p className="mt-1 font-medium text-white">{vehicle.assignedEmployeeName || 'Sin asignar'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Kilometraje</p>
                    <p className="mt-1 font-medium text-white">{vehicle.mileage.toLocaleString('es-MX')} km</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Combustible</p>
                    <p className="mt-1 font-medium text-white">{vehicle.fuelLevel}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tipo</p>
                    <p className="mt-1 font-medium text-white">{vehicle.type}</p>
                  </div>
                </div>

                {vehicle.notes ? <p className="mt-4 text-sm text-slate-400">{vehicle.notes}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEditVehicle(vehicle.id)}>
                    <PencilLine className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setMovementForm((current) => ({ ...current, vehicleId: vehicle.id }))}>
                    <Wrench className="h-4 w-4" />
                    Movimiento
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteVehicle(vehicle.id)}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard id="vehicle-movements" title="Bitácora de movimientos" description="Historial reciente de cambios operativos de la flotilla.">
        {vehicleMovements.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Todavía no hay movimientos registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {vehicleMovements.slice(0, 12).map((movement) => (
              <div key={movement.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{movement.vehicleName}</p>
                    <p className="mt-1 text-sm text-slate-400">{movement.type} · {movement.user}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Fuel className="h-4 w-4" />
                    {formatDateTime(movement.createdAt)}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{movement.notes}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
