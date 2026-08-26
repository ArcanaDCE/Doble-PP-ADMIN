import { X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAppData } from '../../app/providers/app-data-provider.tsx'
import { useAuth } from '../../app/providers/auth-provider.tsx'
import { navigationItems } from '../../lib/navigation.ts'
import { Button } from '../ui/button.tsx'

type AppSidebarProps = {
  currentPath: string
  isOpen: boolean
  onClose: () => void
}

function isActivePath(currentPath: string, itemPath: string) {
  if (itemPath === '/dashboard') {
    return currentPath === itemPath
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
}

function canSeeItem(itemAudience: 'all' | 'admin', role: string) {
  return itemAudience === 'all' || role === 'administrator'
}

function sectionLabel(section: string) {
  if (section === 'admin') {
    return 'Sección administrador'
  }

  if (section === 'operacion') {
    return 'Sección operativa'
  }

  return 'General'
}

export function AppSidebar({ currentPath, isOpen, onClose }: AppSidebarProps) {
  const navigate = useNavigate()
  const { role, signOut, user } = useAuth()
  const { settings } = useAppData()

  async function handleSignOut() {
    const errorMessage = await signOut()

    if (!errorMessage) {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <div className="hidden w-[296px] border-r border-white/10 bg-slate-950/85 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-amber-300 text-xl font-black text-slate-950 shadow-lg shadow-sky-900/20">
              DP
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">
                Private Admin
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">{settings.companyName}</h2>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {(['general', 'operacion', 'admin'] as const).map((section) => {
            const sectionItems = navigationItems.filter(
              (item) => item.section === section && canSeeItem(item.audience, role),
            )

            if (sectionItems.length === 0) {
              return null
            }

            return (
              <div key={section} className="space-y-2">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  {sectionLabel(section)}
                </p>
                {sectionItems.map((item) => {
                  const active = isActivePath(currentPath, item.path)

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={[
                        'group flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
                        active
                          ? 'border-sky-400/40 bg-sky-400/10 text-white shadow-lg shadow-sky-900/10'
                          : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-xl transition',
                          active
                            ? 'bg-sky-300/20 text-sky-200'
                            : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-100',
                        ].join(' ')}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="truncate text-xs text-slate-400">{item.description}</p>
                      </div>
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-100">{user?.email ?? 'Usuario autenticado'}</p>
            <p className="mt-1 text-xs capitalize leading-6 text-amber-50/80">
              {role}
            </p>
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => void handleSignOut()}>
            Cerrar sesión
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm lg:hidden" onClick={onClose}>
          <aside
            className="h-full w-[88vw] max-w-[340px] border-r border-white/10 bg-slate-950 p-4 shadow-2xl shadow-slate-950/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">
                  Doble PP
                </p>
                <p className="mt-1 text-lg font-semibold text-white">Company Admin</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100"
                onClick={onClose}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {navigationItems.filter((item) => canSeeItem(item.audience, role)).map((item) => {
                const active = isActivePath(currentPath, item.path)

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
                      active
                        ? 'border-sky-400/40 bg-sky-400/10 text-white'
                        : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="truncate text-xs text-slate-400">{item.description}</p>
                    </div>
                  </NavLink>
                )
              })}
            </nav>

            <Button
              className="mt-5 w-full"
              variant="secondary"
              onClick={() => {
                onClose()
                void handleSignOut()
              }}
            >
              Cerrar sesión
            </Button>
          </aside>
        </div>
      ) : null}
    </>
  )
}
