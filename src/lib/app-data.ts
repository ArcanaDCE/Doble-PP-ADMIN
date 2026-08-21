export type EmployeeStatus = 'Activo' | 'Inactivo' | 'Vacaciones'
export type ProductStatus = 'Activo' | 'Bajo stock' | 'Inactivo'

export type RoleName = 'administrator' | 'supervisor'

export interface AppSettings {
  companyName: string
  primaryColor: string
  requireApproval: boolean
  sessionReminder: boolean
  lowStockAlert: boolean
  dailySummaryEmail: boolean
  defaultCurrency: 'MXN' | 'USD'
  defaultTimezone: string
  commissionRuleAmount: number
  commissionRuleBonus: number
  expenseMonthlyLimit: number
}

export interface Employee {
  id: string
  name: string
  position: string
  status: EmployeeStatus
  hiredAt: string
  sales: number
  debt: number
  savings: number
  payments: number
  notes?: string
}

export interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number
  cost: number
  stock: number
  minimumStock: number
  status: ProductStatus
  imageUrl?: string
  createdAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  productName: string
  type: 'Entrada' | 'Salida' | 'Ajuste' | 'Devolución'
  quantity: number
  reason: string
  user: string
  createdAt: string
}

export interface EmployeeStock {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  quantity: number
  totalAssigned: number
  totalSold: number
  updatedAt: string
}

export interface EmployeeStockMovement {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  type: 'Asignación' | 'Retiro' | 'Venta'
  quantity: number
  notes: string
  createdAt: string
}

export interface EmployeeCut {
  id: string
  employeeId: string
  employeeName: string
  closedBy: string
  createdAt: string
  salesTotal: number
  xLevel: number
  commission: number
  assignedUnits: number
  soldUnits: number
  remainingUnits: number
  debt: number
  savings: number
  payments: number
  expenses: number
  net: number
  notes?: string
}

export type ExpenseStatus = 'Pendiente' | 'Aprobado' | 'Rechazado'

export interface Expense {
  id: string
  employeeId: string
  employeeName: string
  concept: string
  amount: number
  status: ExpenseStatus
  admin: string
  createdAt: string
  notes?: string
  approvedBy?: string
  updatedAt?: string
}

export interface Sale {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  total: number
  profit: number
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Crédito'
  createdAt: string
}

export interface Payment {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  concept: string
  period: string
  date: string
  notes?: string
}

export interface FinanceMovement {
  id: string
  employeeId: string
  employeeName: string
  type: 'Deuda' | 'Pago de deuda' | 'Ahorro' | 'Retiro de ahorro' | 'Ajuste'
  amount: number
  description: string
  admin: string
  createdAt: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: RoleName
  status: 'Activo' | 'Inactivo'
  lastLogin?: string
}

export interface ActivityItem {
  id: string
  user: string
  action: string
  module: string
  record: string
  createdAt: string
}

export interface AppData {
  settings: AppSettings
  employees: Employee[]
  products: Product[]
  inventoryMovements: InventoryMovement[]
  employeeStocks: EmployeeStock[]
  employeeStockMovements: EmployeeStockMovement[]
  cuts: EmployeeCut[]
  expenses: Expense[]
  sales: Sale[]
  payments: Payment[]
  financeMovements: FinanceMovement[]
  users: AppUser[]
  activity: ActivityItem[]
}

export const APP_STORAGE_KEY = 'doble-pp-admin-v1'
export const SETTINGS_STORAGE_KEY = 'doble-pp-settings-v1'

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: string | Date) {
  const resolved = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(resolved)
}

export function formatDateTime(date: string | Date) {
  const resolved = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(resolved)
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function getDefaultAppData(): AppData {
  const adminEmail = import.meta.env.VITE_APP_ADMIN_EMAIL || 'admin@doblepp.com'

  return {
    settings: {
      companyName: 'Doble PP Company',
      primaryColor: '#38bdf8',
      requireApproval: true,
      sessionReminder: true,
      lowStockAlert: true,
      dailySummaryEmail: true,
      defaultCurrency: 'MXN',
      defaultTimezone: 'America/Mexico_City',
      commissionRuleAmount: 4000,
      commissionRuleBonus: 500,
      expenseMonthlyLimit: 400,
    },
    employees: [],
    products: [],
    inventoryMovements: [],
    employeeStocks: [],
    employeeStockMovements: [],
    cuts: [],
    expenses: [],
    sales: [],
    payments: [],
    financeMovements: [],
    users: [
      {
        id: 'admin-1',
        name: 'Administrador principal',
        email: adminEmail,
        role: 'administrator',
        status: 'Activo',
        lastLogin: new Date().toISOString(),
      },
    ],
    activity: [],
  }
}

export function loadAppData(): AppData {
  if (typeof window === 'undefined') {
    return getDefaultAppData()
  }

  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) {
      const initial = getDefaultAppData()
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(initial))
      return initial
    }

    const parsed = JSON.parse(raw) as Partial<AppData>
    const legacySettings = (() => {
      try {
        const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY)
        return settingsRaw ? (JSON.parse(settingsRaw) as Partial<AppSettings>) : null
      } catch {
        return null
      }
    })()

    const normalizedCuts = (parsed.cuts ?? []).map((cut) => ({
      ...cut,
      salesTotal: cut.salesTotal ?? 0,
      xLevel: cut.xLevel ?? 0,
      commission: cut.commission ?? 0,
      assignedUnits: cut.assignedUnits ?? 0,
      soldUnits: cut.soldUnits ?? 0,
      remainingUnits: cut.remainingUnits ?? 0,
      debt: cut.debt ?? 0,
      savings: cut.savings ?? 0,
      payments: cut.payments ?? 0,
      expenses: cut.expenses ?? 0,
      net: cut.net ?? ((cut.commission ?? 0) - (cut.debt ?? 0) - (cut.expenses ?? 0)),
      notes: cut.notes ?? '',
    }))

    const normalizedExpenses = (parsed.expenses ?? []).map((expense) => ({
      ...expense,
      status: expense.status ?? 'Pendiente',
      notes: expense.notes ?? '',
      approvedBy: expense.approvedBy ?? '',
      updatedAt: expense.updatedAt ?? expense.createdAt,
    }))

    return {
      ...getDefaultAppData(),
      ...parsed,
      settings: {
        ...getDefaultAppData().settings,
        ...legacySettings,
        ...parsed.settings,
      },
      employees: parsed.employees ?? [],
      products: parsed.products ?? [],
      inventoryMovements: parsed.inventoryMovements ?? [],
      employeeStocks: parsed.employeeStocks ?? [],
      employeeStockMovements: parsed.employeeStockMovements ?? [],
      cuts: normalizedCuts,
      expenses: normalizedExpenses,
      sales: parsed.sales ?? [],
      payments: parsed.payments ?? [],
      financeMovements: parsed.financeMovements ?? [],
      users: parsed.users ?? getDefaultAppData().users,
      activity: parsed.activity ?? [],
    }
  } catch {
    const fresh = getDefaultAppData()
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data))
}
