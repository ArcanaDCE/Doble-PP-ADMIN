import {
  ChartColumnIncreasing,
  CreditCard,
  Gauge,
  Layers3,
  Package,
  ReceiptText,
  Settings,
  ShieldUser,
  ShoppingBag,
  Users,
} from 'lucide-react'

export const navigationItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Resumen general y actividad',
    icon: Gauge,
  },
  {
    path: '/employees',
    label: 'Empleados',
    description: 'Equipo, perfiles e historial',
    icon: Users,
  },
  {
    path: '/products',
    label: 'Productos',
    description: 'Catálogo, costos y stock',
    icon: Package,
  },
  {
    path: '/inventory',
    label: 'Inventario',
    description: 'Entradas, salidas y ajustes',
    icon: Layers3,
  },
  {
    path: '/sales',
    label: 'Ventas',
    description: 'Registro y rendimiento',
    icon: ShoppingBag,
  },
  {
    path: '/finance',
    label: 'Deudas / Ahorros',
    description: 'Movimientos y saldos',
    icon: CreditCard,
  },
  {
    path: '/payments',
    label: 'Pagos',
    description: 'Salarios, bonos y comisiones',
    icon: ReceiptText,
  },
  {
    path: '/reports',
    label: 'Reportes',
    description: 'Métricas y exportaciones',
    icon: ChartColumnIncreasing,
  },
  {
    path: '/users',
    label: 'Usuarios',
    description: 'Accesos y roles',
    icon: ShieldUser,
  },
  {
    path: '/settings',
    label: 'Configuración',
    description: 'Preferencias y seguridad',
    icon: Settings,
  },
] as const

export const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employees': 'Empleados',
  '/products': 'Productos',
  '/inventory': 'Inventario',
  '/sales': 'Ventas',
  '/finance': 'Deudas y ahorros',
  '/payments': 'Pagos',
  '/reports': 'Reportes',
  '/users': 'Usuarios',
  '/settings': 'Configuración',
  '/login': 'Acceso',
}
