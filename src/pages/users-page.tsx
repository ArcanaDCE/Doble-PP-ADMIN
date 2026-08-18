import { ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useAppData } from '../app/providers/app-data-provider.tsx'
import { useFeedback } from '../app/providers/feedback-provider.tsx'
import { Button } from '../components/ui/button.tsx'
import { PageHeader } from '../components/ui/page-header.tsx'
import { SectionCard } from '../components/ui/section-card.tsx'
import { StatusBadge } from '../components/ui/status-badge.tsx'

export function UsersPage() {
  const { data, addUser, addActivity } = useAppData()
  const { notifySuccess, notifyError } = useFeedback()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('supervisor')

  function handleCreateUser() {
    if (!name.trim() || !email.trim()) {
      notifyError('Faltan datos del usuario', 'Escribe nombre y correo antes de guardar.')
      return
    }

    if (!email.includes('@')) {
      notifyError('Correo invalido', 'Captura un correo corporativo valido para autorizar el acceso.')
      return
    }

    const nextUser = {
      id: `${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: role as 'administrator' | 'supervisor',
      status: 'Activo' as const,
      lastLogin: new Date().toISOString(),
    }

    addUser(nextUser)
    addActivity({
      user: 'Administrador',
      action: 'Se agrego un usuario',
      module: 'Usuarios',
      record: nextUser.email,
      createdAt: new Date().toISOString(),
    })
    setName('')
    setEmail('')
    setRole('supervisor')
    setShowForm(false)
    notifySuccess('Usuario guardado', `${nextUser.name} ya tiene acceso autorizado.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Control de accesos y permisos para personal autorizado del sistema."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <UserPlus className="h-4 w-4" />
            {showForm ? 'Cerrar' : 'Agregar usuario'}
          </Button>
        }
      />

      {showForm ? (
        <SectionCard title="Crear usuario" description="Registra un nuevo usuario con rol y acceso autorizado.">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="Nombre" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Correo</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Rol</label>
              <select value={role} onChange={(event) => setRole(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 outline-none">
                <option value="administrator">Administrador</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={handleCreateUser}>Guardar usuario</Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Accesos autorizados" description="Lista real de usuarios del sistema.">
        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  {['Usuario', 'Correo', 'Rol', 'Estado', 'Último acceso'].map((header) => (
                    <th key={header} className="px-4 py-4 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-white/5">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4 text-sm font-medium text-white">{user.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-300">{user.email}</td>
                    <td className="px-4 py-4"><StatusBadge label={user.role === 'administrator' ? 'Administrador' : 'Supervisor'} tone="info" /></td>
                    <td className="px-4 py-4"><StatusBadge label={user.status} tone={user.status === 'Activo' ? 'success' : 'warning'} /></td>
                    <td className="px-4 py-4 text-sm text-slate-300">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-MX') : 'Sin acceso'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Política de seguridad" description="La contraseña y la autenticación se manejan de forma segura por Supabase o por credenciales del entorno local.">
        <div className="flex items-start gap-3 rounded-[24px] border border-sky-400/20 bg-sky-400/10 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-200" />
          <p className="text-sm leading-7 text-sky-50/90">
            El sistema está preparado para acceso real, permisos por rol y auditoría operativa sin depender de pantallas decorativas ni botones sin función.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
