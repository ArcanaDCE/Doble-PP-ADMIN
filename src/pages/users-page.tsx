import { ShieldCheck } from 'lucide-react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'

export function UsersPage() {
  const { data, employees } = useAppData()

  function getRoleLabel(role: string) {
    if (role === 'administrator') return 'Administrador'
    if (role === 'supervisor') return 'Supervisor'
    if (role === 'seller') return 'Vendedor'
    return 'Empleado'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accesos del sistema"
        description="Lista de usuarios con acceso al sistema. Para crear o modificar accesos ve al modulo de Empleados."
      />

      <SectionCard title="Usuarios registrados" description="Todos los accesos activos del sistema.">
        {data.users.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No hay usuarios registrados todavia. Para dar acceso a un empleado, ve a Empleados y usa el boton Dar acceso.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    {['Nombre', 'Correo', 'Rol', 'Empleado vinculado', 'Estado', 'Ultimo acceso'].map((header) => (
                      <th key={header} className="px-4 py-4 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-white/5">
                  {data.users.map((user) => {
                    const linked = user.employeeId ? employees.find((employee) => employee.id === user.employeeId) : null
                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-4 text-sm font-medium text-white">{user.name}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">{user.email}</td>
                        <td className="px-4 py-4">
                          <StatusBadge label={getRoleLabel(user.role)} tone="info" />
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">{linked ? linked.name : 'Sin vinculo'}</td>
                        <td className="px-4 py-4"><StatusBadge label={user.status} tone={user.status === 'Activo' ? 'success' : 'warning'} /></td>
                        <td className="px-4 py-4 text-sm text-slate-300">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-MX') : 'Sin acceso'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Como gestionar accesos" description="Instrucciones para crear y administrar accesos del sistema.">
        <div className="flex items-start gap-3 rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-200" />
          <div className="text-sm leading-7 text-sky-50/90">
            <p className="font-medium text-white">Para dar acceso a un empleado:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sky-50/80">
              <li>Ve al modulo de Empleados.</li>
              <li>En la tabla, busca al empleado que no tiene acceso.</li>
              <li>Haz clic en Dar acceso.</li>
              <li>Asigna correo, contrasena y rol.</li>
              <li>Guarda. El empleado ya puede iniciar sesion.</li>
            </ol>
            <p className="mt-3 text-sky-50/70">Tambien puedes asignar el acceso al momento de crear un empleado nuevo desde el formulario de alta.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
