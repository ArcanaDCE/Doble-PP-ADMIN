import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import {
  createId,
  formatCurrency,
  getDefaultAppData,
  isSameBusinessWeek,
  loadAppData,
  saveAppData,
  type ActivityItem,
  type AppData,
  type AppSettings,
  type Employee,
  type EmployeeStock,
  type EmployeeStockMovement,
  type EmployeeCut,
  type Expense,
  type ExpenseStatus,
  type FinanceMovement,
  type InventoryMovement,
  type Payment,
  type Product,
  type Sale,
  type Vehicle,
  type VehicleMovement,
} from '../../lib/app-data.ts'

interface AppDataContextValue {
  data: AppData
  settings: AppSettings
  employees: Employee[]
  products: Product[]
  vehicles: Vehicle[]
  vehicleMovements: VehicleMovement[]
  inventoryMovements: InventoryMovement[]
  employeeStocks: EmployeeStock[]
  employeeStockMovements: EmployeeStockMovement[]
  cuts: EmployeeCut[]
  expenses: Expense[]
  sales: Sale[]
  payments: Payment[]
  financeMovements: FinanceMovement[]
  users: import('../../lib/app-data.ts').AppUser[]
  activity: ActivityItem[]
  addEmployee: (employee: Omit<Employee, 'id' | 'sales' | 'debt' | 'savings' | 'payments'> & {
    initialStock?: Array<{
      productId: string
      quantity: number
      notes?: string
    }>
  }) => { employee: Employee | null; error: string | null }
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void
  deleteEmployee: (employeeId: string) => void
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'status'> & { status?: Product['status'] }) => void
  updateProduct: (productId: string, updates: Partial<Product>) => void
  deleteProduct: (productId: string) => void
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) => void
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void
  deleteVehicle: (vehicleId: string) => void
  addVehicleMovement: (movement: Omit<VehicleMovement, 'id' | 'createdAt'> & { createdAt?: string }) => void
  addInventoryMovement: (movement: { productId: string; productName: string; type: 'Entrada' | 'Salida' | 'Ajuste' | 'Devolución'; quantity: number; reason: string; user: string }) => void
  assignEmployeeStock: (assignment: { employeeId: string; productId: string; quantity: number; notes?: string; user: string }) => string | null
  adjustEmployeeStock: (adjustment: { employeeId: string; productId: string; quantity: number; direction: 'add' | 'remove'; notes?: string; user: string }) => string | null
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => string | null
  closeCut: (cut: Omit<EmployeeCut, 'id' | 'createdAt'> & { createdAt?: string }) => string | null
  addExpense: (expense: Omit<Expense, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'approvedBy'> & { status?: ExpenseStatus }) => string | null
  updateExpenseStatus: (expenseId: string, status: ExpenseStatus, approvedBy: string) => string | null
  addPayment: (payment: Omit<Payment, 'id'>) => void
  addFinanceMovement: (movement: Omit<FinanceMovement, 'id'>) => void
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void
  updateSettings: (updates: Partial<AppSettings>) => void
  addUser: (user: Omit<import('../../lib/app-data.ts').AppUser, 'id' | 'lastLogin'> & { lastLogin?: string }) => void
  updateUser: (userId: string, updates: Partial<import('../../lib/app-data.ts').AppUser>) => void
  resetOperationalData: () => void
  resetAll: () => void
  totals: {
    activeEmployees: number
    totalProducts: number
    availableInventory: number
    vehiclesAvailable: number
    vehiclesAssigned: number
    vehiclesMaintenance: number
    salesToday: number
    salesWeek: number
    salesMonth: number
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
    const vehicles = data.vehicles
    const sales = data.sales
    const employees = data.employees
    const financeMovements = data.financeMovements
    const payments = data.payments

    const totalProducts = products.length
    const availableInventory = products.reduce((sum, item) => sum + item.stock, 0)
    const vehiclesAvailable = vehicles.filter((vehicle) => vehicle.status === 'Disponible').length
    const vehiclesAssigned = vehicles.filter((vehicle) => vehicle.status === 'Asignado').length
    const vehiclesMaintenance = vehicles.filter((vehicle) => vehicle.status === 'Mantenimiento').length
    const activeEmployees = employees.filter((employee) => employee.status === 'Activo').length
    const todayKey = new Date().toISOString().slice(0, 10)
    const monthKey = todayKey.slice(0, 7)
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - 6)
    const weekStartTime = weekStart.getTime()
    const salesToday = sales
      .filter((sale) => sale.createdAt.slice(0, 10) === todayKey)
      .reduce((sum, sale) => sum + sale.total, 0)
    const salesWeek = sales
      .filter((sale) => new Date(sale.createdAt).getTime() >= weekStartTime)
      .reduce((sum, sale) => sum + sale.total, 0)
    const salesMonth = sales
      .filter((sale) => sale.createdAt.slice(0, 7) === monthKey)
      .reduce((sum, sale) => sum + sale.total, 0)
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
      vehiclesAvailable,
      vehiclesAssigned,
      vehiclesMaintenance,
      salesToday,
      salesWeek,
      salesMonth,
      debtSum,
      savingsSum,
      paymentsTotal,
    }
  }, [data])

  const value = useMemo<AppDataContextValue>(() => ({
    data,
    settings: data.settings,
    employees: data.employees,
    products: data.products,
    vehicles: data.vehicles,
    vehicleMovements: data.vehicleMovements,
    inventoryMovements: data.inventoryMovements,
    employeeStocks: data.employeeStocks,
    employeeStockMovements: data.employeeStockMovements,
    cuts: data.cuts,
    expenses: data.expenses,
    sales: data.sales,
    payments: data.payments,
    financeMovements: data.financeMovements,
    users: data.users,
    activity: data.activity,
    totals,
    addEmployee: (employee) => {
      let createdEmployee: Employee | null = null
      let errorMessage: string | null = null
      const employeeId = createId('employee')

      setData((current) => {
        const initialStock = employee.initialStock ?? []
        const normalizedAssignments = new Map<string, { product: Product; quantity: number; notes: string[] }>()

        for (const assignment of initialStock) {
          if (assignment.quantity <= 0) {
            errorMessage = 'La cantidad inicial por producto debe ser mayor a cero.'
            return current
          }

          const product = current.products.find((item) => item.id === assignment.productId)
          if (!product) {
            errorMessage = 'Uno de los productos seleccionados ya no está disponible.'
            return current
          }

          const existingAssignment = normalizedAssignments.get(product.id)
          if (existingAssignment) {
            existingAssignment.quantity += assignment.quantity
            if (assignment.notes?.trim()) {
              existingAssignment.notes.push(assignment.notes.trim())
            }
          } else {
            normalizedAssignments.set(product.id, {
              product,
              quantity: assignment.quantity,
              notes: assignment.notes?.trim() ? [assignment.notes.trim()] : [],
            })
          }
        }

        for (const { product, quantity } of normalizedAssignments.values()) {
          if (product.stock < quantity) {
            errorMessage = `No hay suficiente stock en bodega para asignar ${quantity} unidad(es) de ${product.name}.`
            return current
          }
        }

        const now = new Date().toISOString()
        const nextEmployee: Employee = {
          id: employeeId,
          name: employee.name,
          position: employee.position,
          status: employee.status,
          hiredAt: employee.hiredAt,
          notes: employee.notes,
          sales: 0,
          debt: 0,
          savings: 0,
          payments: 0,
        }

        createdEmployee = nextEmployee

        if (normalizedAssignments.size === 0) {
          return {
            ...current,
            employees: [nextEmployee, ...current.employees],
          }
        }

        const nextProducts: Product[] = current.products.map((product) => {
          const assignment = normalizedAssignments.get(product.id)
          if (!assignment) {
            return product
          }

          const nextStock = product.stock - assignment.quantity
          return {
            ...product,
            stock: nextStock,
            status: nextStock <= product.minimumStock ? 'Bajo stock' : 'Activo',
          }
        })

        const nextEmployeeStocks = Array.from(normalizedAssignments.values()).map(({ product, quantity }) => ({
          id: createId('employee_stock'),
          employeeId,
          employeeName: employee.name,
          productId: product.id,
          productName: product.name,
          quantity,
          totalAssigned: quantity,
          totalSold: 0,
          updatedAt: now,
        } satisfies EmployeeStock))

        const nextInventoryMovements = Array.from(normalizedAssignments.values()).map(({ product, quantity, notes }) => ({
          id: createId('movement'),
          productId: product.id,
          productName: product.name,
          type: 'Salida',
          quantity,
          reason: notes[0] || `Asignación inicial a ${employee.name}`,
          user: 'Administrador',
          createdAt: now,
        } satisfies InventoryMovement))

        const nextEmployeeMovements = Array.from(normalizedAssignments.values()).map(({ product, quantity, notes }) => ({
          id: createId('employee_stock_movement'),
          employeeId,
          employeeName: employee.name,
          productId: product.id,
          productName: product.name,
          type: 'Asignación',
          quantity,
          notes: notes[0] || 'Stock inicial asignado al empleado',
          createdAt: now,
        } satisfies EmployeeStockMovement))

        return {
          ...current,
          employees: [nextEmployee, ...current.employees],
          products: nextProducts,
          inventoryMovements: [...nextInventoryMovements, ...current.inventoryMovements],
          employeeStocks: [...nextEmployeeStocks, ...current.employeeStocks],
          employeeStockMovements: [...nextEmployeeMovements, ...current.employeeStockMovements],
        } satisfies AppData
      })

      return { employee: createdEmployee, error: errorMessage }
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
        employeeStocks: current.employeeStocks.filter((row) => row.employeeId !== employeeId),
        employeeStockMovements: current.employeeStockMovements.filter((row) => row.employeeId !== employeeId),
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
        employeeStocks: current.employeeStocks.filter((row) => row.productId !== productId),
        employeeStockMovements: current.employeeStockMovements.filter((row) => row.productId !== productId),
      }))
    },
    addVehicle: (vehicle) => {
      setData((current) => ({
        ...current,
        vehicles: [
          {
            ...vehicle,
            id: createId('vehicle'),
            createdAt: vehicle.createdAt ?? new Date().toISOString(),
            updatedAt: vehicle.updatedAt ?? new Date().toISOString(),
            status: vehicle.status ?? 'Disponible',
          },
          ...current.vehicles,
        ],
      }))
    },
    updateVehicle: (vehicleId, updates) => {
      setData((current) => ({
        ...current,
        vehicles: current.vehicles.map((vehicle) =>
          vehicle.id === vehicleId
            ? { ...vehicle, ...updates, updatedAt: new Date().toISOString() }
            : vehicle,
        ),
      }))
    },
    deleteVehicle: (vehicleId) => {
      setData((current) => ({
        ...current,
        vehicles: current.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
        vehicleMovements: current.vehicleMovements.filter((movement) => movement.vehicleId !== vehicleId),
      }))
    },
    addVehicleMovement: (movement) => {
      setData((current) => ({
        ...current,
        vehicleMovements: [
          {
            ...movement,
            id: createId('vehicle_movement'),
            createdAt: movement.createdAt ?? new Date().toISOString(),
          },
          ...current.vehicleMovements,
        ],
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
    assignEmployeeStock: (assignment) => {
      let errorMessage: string | null = null

      setData((current) => {
        const employee = current.employees.find((item) => item.id === assignment.employeeId)
        const product = current.products.find((item) => item.id === assignment.productId)

        if (!employee) {
          errorMessage = 'El empleado seleccionado ya no está disponible.'
          return current
        }

        if (!product) {
          errorMessage = 'El producto seleccionado ya no está disponible.'
          return current
        }

        if (assignment.quantity <= 0) {
          errorMessage = 'La cantidad asignada debe ser mayor a cero.'
          return current
        }

        if (product.stock < assignment.quantity) {
          errorMessage = 'No hay suficiente stock en bodega para entregar esa cantidad.'
          return current
        }

        const now = new Date().toISOString()
        const existingStock = current.employeeStocks.find(
          (item) => item.employeeId === employee.id && item.productId === product.id,
        )
        const nextWarehouseStock = product.stock - assignment.quantity
        const updatedProduct: Product = {
          ...product,
          stock: nextWarehouseStock,
          status: nextWarehouseStock <= product.minimumStock ? 'Bajo stock' : 'Activo',
        }
        const nextEmployeeStock: EmployeeStock = existingStock
          ? {
              ...existingStock,
              employeeName: employee.name,
              productName: product.name,
              quantity: existingStock.quantity + assignment.quantity,
              totalAssigned: existingStock.totalAssigned + assignment.quantity,
              updatedAt: now,
            }
          : {
              id: createId('employee_stock'),
              employeeId: employee.id,
              employeeName: employee.name,
              productId: product.id,
              productName: product.name,
              quantity: assignment.quantity,
              totalAssigned: assignment.quantity,
              totalSold: 0,
              updatedAt: now,
            }
        const nextInventoryMovement: InventoryMovement = {
          id: createId('movement'),
          productId: product.id,
          productName: product.name,
          type: 'Salida',
          quantity: assignment.quantity,
          reason: assignment.notes?.trim() || `Asignación a ${employee.name}`,
          user: assignment.user,
          createdAt: now,
        }
        const nextEmployeeMovement: EmployeeStockMovement = {
          id: createId('employee_stock_movement'),
          employeeId: employee.id,
          employeeName: employee.name,
          productId: product.id,
          productName: product.name,
          type: 'Asignación',
          quantity: assignment.quantity,
          notes: assignment.notes?.trim() || 'Stock asignado al empleado',
          createdAt: now,
        }

        return {
          ...current,
          products: current.products.map((item) => (item.id === product.id ? updatedProduct : item)),
          inventoryMovements: [nextInventoryMovement, ...current.inventoryMovements],
          employeeStocks: existingStock
            ? current.employeeStocks.map((item) => (item.id === existingStock.id ? nextEmployeeStock : item))
            : [nextEmployeeStock, ...current.employeeStocks],
          employeeStockMovements: [nextEmployeeMovement, ...current.employeeStockMovements],
        } satisfies AppData
      })

      return errorMessage
    },
    adjustEmployeeStock: (adjustment) => {
      let errorMessage: string | null = null

      setData((current) => {
        const employee = current.employees.find((item) => item.id === adjustment.employeeId)
        const product = current.products.find((item) => item.id === adjustment.productId)
        const existingStock = current.employeeStocks.find(
          (item) => item.employeeId === adjustment.employeeId && item.productId === adjustment.productId,
        )

        if (!employee) {
          errorMessage = 'El empleado seleccionado ya no está disponible.'
          return current
        }

        if (!product) {
          errorMessage = 'El producto seleccionado ya no está disponible.'
          return current
        }

        if (adjustment.quantity <= 0) {
          errorMessage = 'La cantidad debe ser mayor a cero.'
          return current
        }

        if (adjustment.direction === 'add') {
          if (product.stock < adjustment.quantity) {
            errorMessage = 'No hay suficiente stock en bodega para agregar esa cantidad.'
            return current
          }

          const now = new Date().toISOString()
          const nextWarehouseStock = product.stock - adjustment.quantity
          const updatedProduct: Product = {
            ...product,
            stock: nextWarehouseStock,
            status: nextWarehouseStock <= product.minimumStock ? 'Bajo stock' : 'Activo',
          }
          const updatedEmployeeStock: EmployeeStock = existingStock
            ? {
                ...existingStock,
                employeeName: employee.name,
                productName: product.name,
                quantity: existingStock.quantity + adjustment.quantity,
                totalAssigned: existingStock.totalAssigned + adjustment.quantity,
                updatedAt: now,
              }
            : {
                id: createId('employee_stock'),
                employeeId: employee.id,
                employeeName: employee.name,
                productId: product.id,
                productName: product.name,
                quantity: adjustment.quantity,
                totalAssigned: adjustment.quantity,
                totalSold: 0,
                updatedAt: now,
              }
          const nextInventoryMovement: InventoryMovement = {
            id: createId('movement'),
            productId: product.id,
            productName: product.name,
            type: 'Salida',
            quantity: adjustment.quantity,
            reason: adjustment.notes?.trim() || `Asignación a ${employee.name}`,
            user: adjustment.user,
            createdAt: now,
          }
          const nextEmployeeMovement: EmployeeStockMovement = {
            id: createId('employee_stock_movement'),
            employeeId: employee.id,
            employeeName: employee.name,
            productId: product.id,
            productName: product.name,
            type: 'Asignación',
            quantity: adjustment.quantity,
            notes: adjustment.notes?.trim() || 'Stock agregado al empleado',
            createdAt: now,
          }

          return {
            ...current,
            products: current.products.map((item) => (item.id === product.id ? updatedProduct : item)),
            inventoryMovements: [nextInventoryMovement, ...current.inventoryMovements],
            employeeStocks: existingStock
              ? current.employeeStocks.map((item) => (item.id === existingStock.id ? updatedEmployeeStock : item))
              : [updatedEmployeeStock, ...current.employeeStocks],
            employeeStockMovements: [nextEmployeeMovement, ...current.employeeStockMovements],
          } satisfies AppData
        }

        if (!existingStock || existingStock.quantity < adjustment.quantity) {
          errorMessage = 'El empleado no tiene suficiente stock para retirar esa cantidad.'
          return current
        }

        const now = new Date().toISOString()
        const nextWarehouseStock = product.stock + adjustment.quantity
        const updatedProduct: Product = {
          ...product,
          stock: nextWarehouseStock,
          status: nextWarehouseStock <= product.minimumStock ? 'Bajo stock' : 'Activo',
        }
        const updatedEmployeeStock: EmployeeStock = {
          ...existingStock,
          employeeName: employee.name,
          productName: product.name,
          quantity: existingStock.quantity - adjustment.quantity,
          updatedAt: now,
        }
        const nextInventoryMovement: InventoryMovement = {
          id: createId('movement'),
          productId: product.id,
          productName: product.name,
          type: 'Entrada',
          quantity: adjustment.quantity,
          reason: adjustment.notes?.trim() || `Retiro a ${employee.name}`,
          user: adjustment.user,
          createdAt: now,
        }
        const nextEmployeeMovement: EmployeeStockMovement = {
          id: createId('employee_stock_movement'),
          employeeId: employee.id,
          employeeName: employee.name,
          productId: product.id,
          productName: product.name,
          type: 'Retiro',
          quantity: adjustment.quantity,
          notes: adjustment.notes?.trim() || 'Stock retirado del empleado',
          createdAt: now,
        }

        return {
          ...current,
          products: current.products.map((item) => (item.id === product.id ? updatedProduct : item)),
          inventoryMovements: [nextInventoryMovement, ...current.inventoryMovements],
          employeeStocks: current.employeeStocks.map((item) =>
            item.id === existingStock.id ? updatedEmployeeStock : item,
          ),
          employeeStockMovements: [nextEmployeeMovement, ...current.employeeStockMovements],
        } satisfies AppData
      })

      return errorMessage
    },
    addSale: (sale) => {
      let errorMessage: string | null = null

      setData((current) => {
        const employee = current.employees.find((item) => item.id === sale.employeeId)
        const product = current.products.find((item) => item.id === sale.productId)
        const employeeStock = current.employeeStocks.find(
          (item) => item.employeeId === sale.employeeId && item.productId === sale.productId,
        )

        if (!employee) {
          errorMessage = 'El empleado seleccionado ya no está disponible.'
          return current
        }

        if (!product) {
          errorMessage = 'El producto seleccionado ya no está disponible.'
          return current
        }

        if (!employeeStock || employeeStock.quantity < sale.quantity) {
          errorMessage = 'El empleado no tiene stock suficiente de ese producto para registrar la venta.'
          return current
        }

        const now = new Date().toISOString()
        const updatedEmployeeStock: EmployeeStock = {
          ...employeeStock,
          employeeName: employee.name,
          productName: product.name,
          quantity: employeeStock.quantity - sale.quantity,
          totalSold: employeeStock.totalSold + sale.quantity,
          updatedAt: now,
        }
        const employeeMovement: EmployeeStockMovement = {
          id: createId('employee_stock_movement'),
          employeeId: employee.id,
          employeeName: employee.name,
          productId: product.id,
          productName: product.name,
          type: 'Venta',
          quantity: sale.quantity,
          notes: `Venta registrada por ${formatCurrency(sale.total)}`,
          createdAt: now,
        }

        return {
          ...current,
          sales: [
            { ...sale, id: createId('sale'), createdAt: now },
            ...current.sales,
          ],
          employeeStocks: current.employeeStocks.map((item) =>
            item.id === employeeStock.id ? updatedEmployeeStock : item,
          ),
          employeeStockMovements: [employeeMovement, ...current.employeeStockMovements],
          employees: current.employees.map((item) =>
            item.id === sale.employeeId ? { ...item, sales: item.sales + sale.total } : item,
          ),
        } satisfies AppData
      })

      return errorMessage
    },
    closeCut: (cut) => {
      let errorMessage: string | null = null

      setData((current) => {
        const employee = current.employees.find((item) => item.id === cut.employeeId)
        if (!employee) {
          errorMessage = 'El empleado seleccionado ya no está disponible.'
          return current
        }

        const lastCut = [...current.cuts]
          .filter((item) => item.employeeId === employee.id)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]

        if (lastCut && isSameBusinessWeek(lastCut.createdAt, cut.createdAt ?? new Date().toISOString())) {
          errorMessage = 'Este empleado ya tiene un corte registrado en la semana actual.'
          return current
        }

        const since = lastCut ? new Date(lastCut.createdAt).getTime() : 0
        const periodSales = current.sales.filter(
          (sale) => sale.employeeId === employee.id && new Date(sale.createdAt).getTime() > since,
        )
        const salesTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0)
        const periodExpenses = current.expenses.filter(
          (expense) =>
            expense.employeeId === employee.id &&
            expense.status === 'Aprobado' &&
            new Date(expense.createdAt).getTime() > since,
        )
        const expensesTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        const xRuleAmount = current.settings.commissionRuleAmount > 0 ? current.settings.commissionRuleAmount : 4000
        const xBonusAmount = current.settings.commissionRuleBonus > 0 ? current.settings.commissionRuleBonus : 500
        const xLevel = Math.floor(salesTotal / xRuleAmount)
        const commission = xLevel * xBonusAmount
        const employeeStocks = current.employeeStocks.filter((item) => item.employeeId === employee.id)
        const assignedUnits = employeeStocks.reduce((sum, item) => sum + item.totalAssigned, 0)
        const soldUnits = employeeStocks.reduce((sum, item) => sum + item.totalSold, 0)
        const remainingUnits = employeeStocks.reduce((sum, item) => sum + item.quantity, 0)
        const nextCut: EmployeeCut = {
          id: createId('cut'),
          employeeId: employee.id,
          employeeName: employee.name,
          closedBy: cut.closedBy,
          createdAt: cut.createdAt ?? new Date().toISOString(),
          salesTotal,
          xLevel,
          commission,
          assignedUnits,
          soldUnits,
          remainingUnits,
          debt: employee.debt,
          savings: employee.savings,
          payments: employee.payments,
          expenses: expensesTotal,
          net: commission - expensesTotal - employee.debt,
          notes: cut.notes?.trim(),
        }

        return {
          ...current,
          cuts: [nextCut, ...current.cuts],
        } satisfies AppData
      })

      return errorMessage
    },
    addExpense: (expense) => {
      let errorMessage: string | null = null

      setData((current) => {
        const employee = current.employees.find((item) => item.id === expense.employeeId)
        if (!employee) {
          errorMessage = 'El empleado seleccionado ya no está disponible.'
          return current
        }

        if (expense.amount <= 0) {
          errorMessage = 'El gasto debe ser mayor a cero.'
          return current
        }

        const now = new Date().toISOString()
        const monthKey = now.slice(0, 7)
        const approvedThisMonth = current.expenses.filter(
          (item) =>
            item.employeeId === employee.id &&
            item.status === 'Aprobado' &&
            item.createdAt.slice(0, 7) === monthKey,
        ).reduce((sum, item) => sum + item.amount, 0)
        const limit = current.settings.expenseMonthlyLimit > 0 ? current.settings.expenseMonthlyLimit : 400
        const autoStatus: ExpenseStatus =
          expense.status ?? (approvedThisMonth + expense.amount > limit ? 'Pendiente' : 'Aprobado')

        const nextExpense: Expense = {
          id: createId('expense'),
          employeeId: employee.id,
          employeeName: employee.name,
          concept: expense.concept.trim() || 'Sin concepto',
          amount: expense.amount,
          status: autoStatus,
          admin: expense.admin,
          createdAt: now,
          notes: expense.notes?.trim(),
        }

        return {
          ...current,
          expenses: [nextExpense, ...current.expenses],
        } satisfies AppData
      })

      return errorMessage
    },
    updateExpenseStatus: (expenseId, status, approvedBy) => {
      let errorMessage: string | null = null

      setData((current) => {
        const expense = current.expenses.find((item) => item.id === expenseId)
        if (!expense) {
          errorMessage = 'El gasto seleccionado ya no está disponible.'
          return current
        }

        return {
          ...current,
          expenses: current.expenses.map((item) =>
            item.id === expenseId
              ? { ...item, status, approvedBy, updatedAt: new Date().toISOString() }
              : item,
          ),
        } satisfies AppData
      })

      return errorMessage
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
    updateSettings: (updates) => {
      setData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          ...updates,
        },
      }))
    },
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
    updateUser: (userId, updates) => {
      setData((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === userId ? { ...user, ...updates } : user,
        ),
      }))
    },
    resetOperationalData: () => {
      setData((current) => ({
        ...current,
        employees: current.employees.map((employee) => ({
          ...employee,
          sales: 0,
          debt: 0,
          savings: 0,
          payments: 0,
        })),
        employeeStocks: current.employeeStocks.map((stock) => ({
          ...stock,
          quantity: stock.totalAssigned,
          totalSold: 0,
          updatedAt: new Date().toISOString(),
        })),
        employeeStockMovements: current.employeeStockMovements.filter(
          (movement) => movement.type !== 'Venta',
        ),
        cuts: [],
        expenses: [],
        sales: [],
        payments: [],
        financeMovements: [],
        activity: [],
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
