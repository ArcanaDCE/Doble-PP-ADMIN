import { CalendarDays, Menu, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '../../app/providers/app-data-provider.tsx'
import { useAuth } from '../../app/providers/auth-provider.tsx'
import { navigationItems, routeTitles } from '../../lib/navigation.ts'
import { AppSidebar } from './app-sidebar.tsx'

function formatToday(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function AdminShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [today, setToday] = useState(() => new Date())
  const { role, user } = useAuth()
  const { employees, products } = useAppData()

  const lastSyncLabel = useMemo(
    () =>
      today.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [today],
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setToday(new Date())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  const currentTitle = useMemo(() => {
    if (location.pathname.startsWith('/employees/')) {
      return 'Perfil del empleado'
    }

    const item = navigationItems.find((entry) => entry.path === location.pathname)
    return item?.label ?? routeTitles[location.pathname] ?? 'Doble PP Company'
  }, [location.pathname])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return navigationItems.slice(0, 5).map((item) => ({
        id: `module-${item.path}`,
        label: item.label,
        meta: item.description,
        path: item.path,
        type: 'Módulo',
      }))
    }

    const moduleMatches = navigationItems
      .filter((item) => {
        const haystack = `${item.label} ${item.description}`.toLowerCase()
        return haystack.includes(query)
      })
      .map((item) => ({
        id: `module-${item.path}`,
        label: item.label,
        meta: item.description,
        path: item.path,
        type: 'Módulo',
      }))

    const employeeMatches = employees
      .filter((employee) => {
        const haystack = `${employee.name} ${employee.position} ${employee.status}`.toLowerCase()
        return haystack.includes(query)
      })
      .map((employee) => ({
        id: `employee-${employee.id}`,
        label: employee.name,
        meta: `${employee.position} • ${employee.status}`,
        path: `/employees/${employee.id}`,
        type: 'Empleado',
      }))

    const productMatches = products
      .filter((product) => {
        const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase()
        return haystack.includes(query)
      })
      .map((product) => ({
        id: `product-${product.id}`,
        label: product.name,
        meta: `${product.category} • stock ${product.stock}`,
        path: '/products',
        type: 'Producto',
      }))

    return [...moduleMatches, ...employeeMatches, ...productMatches].slice(0, 7)
  }, [employees, products, searchQuery])

  const handleSearchSelect = (path: string) => {
    navigate(path)
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  const handleSearchSubmit = () => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setIsSearchOpen(true)
      return
    }

    const selectedResult = searchResults[0]
    if (selectedResult) {
      handleSearchSelect(selectedResult.path)
      return
    }

    const fallback = navigationItems.find((item) => item.label.toLowerCase().includes(query))
    if (fallback) {
      handleSearchSelect(fallback.path)
      return
    }

    setIsSearchOpen(true)
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <AppSidebar
          currentPath={location.pathname}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:border-sky-400/50 hover:bg-white/10 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">
                  Doble PP Company
                </p>
               <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold text-white">{currentTitle}</h1>
                  <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Operación en vivo
                  </span>
                  <span className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                    Sincronizado {lastSyncLabel}
                  </span>
                </div>
              </div>
 
              <div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
                <div className="relative block w-full max-w-[420px]">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition focus-within:border-sky-400/60 focus-within:bg-slate-900/70">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value)
                        setIsSearchOpen(true)
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSearchSubmit()
                        }

                        if (event.key === 'Escape') {
                          setIsSearchOpen(false)
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setIsSearchOpen(false), 120)
                      }}
                      placeholder="Buscar módulos, empleados o productos"
                      className="w-full border-0 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                      aria-label="Buscar módulos, empleados o productos"
                    />
                  </div>

                  {isSearchOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
                      {searchResults.length > 0 ? (
                        <div className="max-h-[320px] overflow-y-auto p-2">
                          {searchResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                handleSearchSelect(result.path)
                              }}
                              className="flex w-full items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-sky-500/30 hover:bg-slate-900/80"
                            >
                              <div>
                                <p className="text-sm font-medium text-white">{result.label}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{result.meta}</p>
                              </div>
                              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                                {result.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-300">
                          Sin coincidencias. Prueba con <span className="font-medium text-white">dashboard</span>, <span className="font-medium text-white">empleados</span> o <span className="font-medium text-white">productos</span>.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 md:flex">
                  <CalendarDays className="h-4 w-4 text-sky-300" />
                  <span>{formatToday(today)}</span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-amber-300 font-semibold text-slate-950">
                    DP
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-white">{user?.email ?? 'Usuario autenticado'}</p>
                    <p className="text-xs capitalize text-slate-400">
                      {role === 'unknown' ? 'Rol por definir' : role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
