import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import {
  createId,
  formatCurrency,
  getDefaultAppData,
  loadAppData,
  saveAppData,
  type ActivityItem,
  type AppData,
  type Employee,
  type FinanceMovement,
  type Payment,
  type Product,
  type Sale,
} from '../../lib/app-data.ts'

interface AppDataContextValue {
  data: AppData
  employees: Employee[]
  products: Product[]
  inventoryMovements: import('../../lib/app-data.ts').InventoryMovement[]
  sales: Sale[]
  payments: Payment[]
  financeMovements: FinanceMovement[]
  users: import('../../lib/app-data.ts').AppUser[]
  activity: ActivityItem[]
  addEmployee: (employee: Omit<Employee, 'id' | 'sales' | 'debt' | 'savings' | 'payments'>) => void
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void
  deleteEmployee: (employeeId: string) => void
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'status'> & { status?: Product['status'] }) => void
  updateProduct: (productId: string, updates: Partial<Product>) => void
  deleteProduct: (productId: string) => void
  addInventoryMovement: (movement: { productId: string; productName: string; type: 'Entrada' | 'Salida' | 'Ajuste' | 'Devolución'; quantity: number; reason: string; user: string }) => void
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void
  addPayment: (payment: Omit<Payment, 'id'>) => void
  addFinanceMovement: (movement: Omit<FinanceMovement, 'id'>) => void
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void
  addUser: (user: Omit<import('../../lib/app-data.ts').AppUser, 'id' | 'lastLogin'> & { lastLogin?: string }) => void
  resetAll: () => void
  totals: {
    activeEmployees: number
    totalProducts: number
    availableInventory: number
    salesToday: number
    debtSum: number
    savingsSum: number
    paymentsTotal: number
  }
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

export function AppDataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(() => loadAppData())

  useEffect(() => {
    saveAppData(data)
  }, [data])

  function addActivity(activity: Omit<ActivityItem, 'id'>) {
    setData((current) => ({
      ...current,
      activity: [{ id: createId('activity'), ...activity }, ...current.activity].slice(0, 30),
    }))
  }

  const totals = useMemo(() => {
    const products = data.products
    const sales = data.sales
    const employees = data.employees
    const financeMovements = data.financeMovements
    const payments = data.payments

    const totalProducts = products.length
    const availableInventory = products.reduce((sum, item) => sum + item.stock, 0)
    const activeEmployees = employees.filter((employee) => employee.status === 'Activo').length
    const salesToday = sales.reduce((sum, sale) => sum + sale.total, 0)
    const debtSum = employees.reduce((sum, employee) => sum + employee.debt, 0) + financeMovements
      .filter((movement) => movement.type === 'Deuda' || movement.type === 'Ajuste')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const savingsSum = employees.reduce((sum, employee) => sum + employee.savings, 0) + financeMovements
      .filter((movement) => movement.type === 'Ahorro')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0)

    return {
      activeEmployees,
      totalProducts,
      availableInventory,
      salesToday,
      debtSum,
      savingsSum,
      paymentsTotal,
    }
  }, [data])

  const value = useMemo<AppDataContextValue>(() => ({
    data,
    employees: data.employees,
    products: data.products,
    inventoryMovements: data.inventoryMovements,
    sales: data.sales,
    payments: data.payments,
    financeMovements: data.financeMovements,
    users: data.users,
    activity: data.activity,
    totals,
    addEmployee: (employee) => {
      setData((current) => ({
        ...current,
        employees: [
          { ...employee, id: createId('employee'), sales: 0, debt: 0, savings: 0, payments: 0 },
          ...current.employees,
        ],
      }))
    },
    updateEmployee: (employeeId, updates) => {
      setData((current) => ({
        ...current,
        employees: current.employees.map((employee) =>
          employee.id === employeeId ? { ...employee, ...updates } : employee,
        ),
      }))
    },
    deleteEmployee: (employeeId) => {
      setData((current) => ({
        ...current,
        employees: current.employees.filter((employee) => employee.id !== employeeId),
      }))
    },
    addProduct: (product) => {
      setData((current) => ({
        ...current,
        products: [
          {
            ...product,
            id: createId('product'),
            createdAt: new Date().toISOString(),
            status: product.status ?? 'Activo',
          },
          ...current.products,
        ],
      }))
    },
    updateProduct: (productId, updates) => {
      setData((current) => ({
        ...current,
        products: current.products.map((product) =>
          product.id === productId ? { ...product, ...updates } : product,
        ),
      }))
    },
    deleteProduct: (productId) => {
      setData((current) => ({
        ...current,
        products: current.products.filter((product) => product.id !== productId),
      }))
    },
    addInventoryMovement: (movement) => {
      setData((current) => {
        const product = current.products.find((item) => item.id === movement.productId)
        if (!product) {
          return current
        }

        const nextStock =
          movement.type === 'Entrada'
            ? product.stock + movement.quantity
            : movement.type === 'Salida' || movement.type === 'Devolución'
              ? product.stock - movement.quantity
              : product.stock

        const updatedProduct: Product = {
          ...product,
          stock: Math.max(0, nextStock),
          status: nextStock <= product.minimumStock ? 'Bajo stock' : 'Activo',
        }

        const nextMovement: import('../../lib/app-data.ts').InventoryMovement = {
          id: createId('movement'),
          ...movement,
          createdAt: new Date().toISOString(),
        }

        return {
          ...current,
          products: current.products.map((item) => (item.id === movement.productId ? updatedProduct : item)),
          inventoryMovements: [nextMovement, ...current.inventoryMovements],
        } satisfies AppData
      })
    },
    addSale: (sale) => {
      setData((current) => ({
        ...current,
        sales: [
          { ...sale, id: createId('sale'), createdAt: new Date().toISOString() },
          ...current.sales,
        ],
        employees: current.employees.map((employee) =>
          employee.id === sale.employeeId
            ? { ...employee, sales: employee.sales + sale.total, payments: employee.payments + sale.total * 0.1 }
            : employee,
        ),
      }) satisfies AppData)
    },
    addPayment: (payment) => {
      setData((current) => {
        const nextPayment: Payment = {
          ...payment,
          id: createId('payment'),
        }

        return {
          ...current,
          payments: [nextPayment, ...current.payments],
          employees: current.employees.map((employee) =>
            employee.id === payment.employeeId ? { ...employee, payments: employee.payments + payment.amount } : employee,
          ),
        } satisfies AppData
      })
    },
    addFinanceMovement: (movement) => {
      setData((current) => ({
        ...current,
        financeMovements: [{ ...movement, id: createId('finance') }, ...current.financeMovements],
        employees: current.employees.map((employee) => {
          if (employee.id !== movement.employeeId) {
            return employee
          }

          if (movement.type === 'Deuda' || movement.type === 'Ajuste') {
            return { ...employee, debt: employee.debt + movement.amount }
          }

          if (movement.type === 'Pago de deuda') {
            return { ...employee, debt: Math.max(0, employee.debt - movement.amount) }
          }

          if (movement.type === 'Ahorro') {
            return { ...employee, savings: employee.savings + movement.amount }
          }

          if (movement.type === 'Retiro de ahorro') {
            return { ...employee, savings: Math.max(0, employee.savings - movement.amount) }
          }

          return employee
        }),
      }) satisfies AppData)
    },
    addActivity: addActivity,
    addUser: (user) => {
      setData((current) => ({
        ...current,
        users: [
          {
            ...user,
            id: createId('user'),
            lastLogin: user.lastLogin ?? new Date().toISOString(),
          },
          ...current.users,
        ],
      }))
    },
    resetAll: () => {
      setData(getDefaultAppData())
    },
  }), [data, totals])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData debe usarse dentro de AppDataProvider')
  }

  return context
}

export function useAppDataSnapshot() {
  return useAppData()
}

export { formatCurrency }
